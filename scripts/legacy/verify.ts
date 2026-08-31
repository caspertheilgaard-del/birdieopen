import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  computeCarryover,
  computeFinalRound,
  finalScaleForYear,
  scoreRound,
  strokesOnHole,
  holePoints,
} from "../../src/lib/scoring";
import type { LegacyBirdieRow, LegacyScorecard, LegacySeason, LegacyStandings } from "./types";
import { rankBirdies } from "../../src/lib/scoring";

/**
 * Recomputes every season with our own scoring engine and diffs it against the
 * numbers the old site published. Any line printed here is a mismatch to explain
 * before the import is trusted.
 */

const DATA = path.join(process.cwd(), "data", "legacy");

async function load<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(DATA, name), "utf8")) as T;
  } catch {
    return null;
  }
}

type Counters = { checks: number; problems: string[] };

function report(c: Counters, message: string): void {
  c.problems.push(message);
}

async function main(): Promise<void> {
  const seasons = (await load<LegacySeason[]>("seasons.json")) ?? [];
  const counters: Counters = { checks: 0, problems: [] };
  let cardCount = 0;

  for (const season of seasons) {
    const standings = await load<LegacyStandings>(`standings-${season.year}.json`);
    if (!standings) continue;
    const cards = (await load<LegacyScorecard[]>(`scorecards-${season.year}.json`)) ?? [];
    cardCount += cards.length;

    const cardKey = (roundId: string, playerId: string) => `${roundId}/${playerId}`;
    const byKey = new Map(cards.map((c) => [cardKey(c.legacyRoundId, c.legacyPlayerId), c]));

    // 1. Every scorecard must reproduce itself from par, index and gross scores.
    for (const card of cards) {
      const specs = card.holes.map((h) => ({ hole: h.hole, par: h.par ?? 0, key: h.key ?? 0 }));
      const gross = Object.fromEntries(card.holes.map((h) => [h.hole, h.gross]));
      const strokes = card.strokesReceived ?? 0;

      const recomputed = scoreRound(specs, gross, strokes);
      counters.checks += 1;
      if (card.total !== null && recomputed.total !== card.total) {
        report(
          counters,
          `${season.year} scorekort ${card.legacyRoundId}/${card.legacyPlayerId} (${card.playerName}): motor ${recomputed.total}, site ${card.total}`,
        );
      }

      for (const hole of card.holes) {
        const received = strokesOnHole(strokes, hole.key ?? 0, card.holes.length);
        counters.checks += 1;
        if (hole.strokes !== null && received !== hole.strokes) {
          report(
            counters,
            `${season.year} ${card.playerName} hul ${hole.hole}: tildelte slag ${received}, site ${hole.strokes}`,
          );
        }
        const points = holePoints(hole.gross, hole.par ?? 0, hole.strokes ?? 0);
        counters.checks += 1;
        if (hole.points !== null && points !== hole.points) {
          report(
            counters,
            `${season.year} ${card.playerName} hul ${hole.hole}: point ${points}, site ${hole.points}`,
          );
        }
      }
    }

    // 1b. The birdie list must come out of our own ranking with the same numbers.
    const birdieRows = (await load<LegacyBirdieRow[]>(`birdies-${season.year}.json`)) ?? [];
    if (birdieRows.length > 0) {
      const entries = birdieRows.flatMap((row) =>
        row.details.map((detail) => ({
          playerId: row.playerName,
          key: detail.key ?? 0,
          points: detail.points ?? 0,
          type: /eagle/i.test(detail.type)
            ? ("eagle" as const)
            : /hole.?in.?one/i.test(detail.type)
              ? ("hole-in-one" as const)
              : ("birdie" as const),
        })),
      );
      const ours = new Map(rankBirdies(entries).map((r) => [r.playerId, r]));
      for (const row of birdieRows) {
        const mine = ours.get(row.playerName);
        counters.checks += 1;
        if (!mine) {
          report(counters, `${season.year} birdieliste ${row.playerName}: mangler`);
          continue;
        }
        if (mine.count !== row.count || mine.keySum !== row.keySum || mine.pointSum !== row.pointSum) {
          report(
            counters,
            `${season.year} birdieliste ${row.playerName}: motor ${mine.count}/${mine.keySum}/${mine.pointSum}, site ${row.count}/${row.keySum}/${row.pointSum}`,
          );
        }
      }
    }

    const prelim = standings.sections.find((s) => s.kind === "prelim");
    const final = standings.sections.find((s) => s.kind === "final");

    // 2. Standings cells must match the scorecard totals behind them.
    if (prelim) {
      for (const row of prelim.rows) {
        for (const cell of row.cells) {
          if (!cell.legacyRoundId || !row.legacyPlayerId || cell.average) continue;
          const card = byKey.get(cardKey(cell.legacyRoundId, row.legacyPlayerId));
          if (!card) continue;
          counters.checks += 1;
          if (card.total !== cell.value) {
            report(
              counters,
              `${season.year} ${row.playerName} runde ${cell.legacyRoundId}: stilling ${cell.value}, scorekort ${card.total}`,
            );
          }
        }

        // 3. The season total is the sum of the round cells.
        const sum = row.cells.reduce((n, c) => n + (c.value ?? 0), 0);
        counters.checks += 1;
        if (row.total !== null && sum !== row.total) {
          report(counters, `${season.year} ${row.playerName}: sum ${sum}, site total ${row.total}`);
        }
      }
    }

    if (prelim && final) {
      const finalists = final.rows.map((r) => r.legacyPlayerId ?? r.playerName);
      const prelimTotals = prelim.rows.map((r) => ({
        playerId: r.legacyPlayerId ?? r.playerName,
        total: r.total ?? 0,
      }));

      // 4. Points carried into the finals.
      const carry = computeCarryover(prelimTotals, finalists);
      const carryById = new Map(carry.map((c) => [c.playerId, c.carryover]));
      for (const row of final.rows) {
        const id = row.legacyPlayerId ?? row.playerName;
        const ours = carryById.get(id);
        counters.checks += 1;
        if (row.carryover !== null && ours !== undefined && ours !== row.carryover) {
          report(
            counters,
            `${season.year} ${row.playerName}: overført ${ours}, site ${row.carryover}`,
          );
        }
      }

      // 5. Points awarded in each final round.
      for (const column of final.columns) {
        const scores = final.rows
          .map((row) => {
            const cell = row.cells[column.index];
            return { playerId: row.legacyPlayerId ?? row.playerName, points: cell?.stableford ?? null, cell };
          })
          .filter((s) => s.points !== null) as {
          playerId: string;
          points: number;
          cell: { value: number | null };
        }[];
        if (scores.length === 0) continue;

        const awarded = computeFinalRound(
          scores.map((s) => ({ playerId: s.playerId, points: s.points })),
          final.rows.length,
          finalScaleForYear(season.year),
        );
        const awardedById = new Map(awarded.map((a) => [a.playerId, a.awarded]));
        for (const s of scores) {
          counters.checks += 1;
          const ours = awardedById.get(s.playerId);
          if (s.cell.value !== null && ours !== s.cell.value) {
            report(
              counters,
              `${season.year} runde ${column.venue} ${s.playerId}: finalepoint ${ours}, site ${s.cell.value}`,
            );
          }
        }
      }

      // 6. The final total is the carryover plus every round awarded.
      for (const row of final.rows) {
        const sum = (row.carryover ?? 0) + row.cells.reduce((n, c) => n + (c.value ?? 0), 0);
        counters.checks += 1;
        if (row.total !== null && sum !== row.total) {
          report(counters, `${season.year} finale ${row.playerName}: sum ${sum}, site ${row.total}`);
        }
      }
    }
  }

  console.log(`${cardCount} scorekort, ${counters.checks} kontroller`);
  if (counters.problems.length === 0) {
    console.log("Ingen afvigelser.");
    return;
  }

  const grouped = new Map<string, number>();
  for (const p of counters.problems) {
    const key = p.replace(/\d+/g, "#");
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  console.log(`\n${counters.problems.length} afvigelser i ${grouped.size} mønstre:`);
  for (const [pattern, count] of [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${count}x  ${pattern}`);
  }
  console.log("\nEksempler:");
  for (const p of counters.problems.slice(0, 12)) console.log(`  ${p}`);
}

main();
