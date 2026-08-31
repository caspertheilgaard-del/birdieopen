import { closeBrowser, fetchPage, writeJson } from "./fetch";
import { parseBirdies, parsePlayers, parseSchedule, parseScorecard, parseStandings } from "./parse";
import type { LegacyScorecard, LegacySeason } from "./types";

/** Seasons 2013-2026 live at /stilling/{13..26}; 2012 is a hardcoded page with round totals only. */
const SEASONS: LegacySeason[] = [
  { legacyId: "2012", year: 2012, label: "Birdie Open 2012", path: "stilling/2012/hardcoded" },
  ...Array.from({ length: 14 }, (_, i) => {
    const id = String(13 + i);
    return {
      legacyId: id,
      year: 2000 + 13 + i,
      label: `Birdie Open ${2000 + 13 + i}`,
      path: `stilling/${id}/db`,
    };
  }),
];

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const seasons = only.length > 0 ? SEASONS.filter((s) => only.includes(s.legacyId)) : SEASONS;

async function main(): Promise<void> {
  await writeJson("seasons.json", SEASONS);

  const players = parsePlayers(await fetchPage("golfer"));
  await writeJson("players.json", players);
  console.log(`Deltagere: ${players.active.length} aktive, ${players.former.length} tidligere`);

  for (const season of seasons) {
    const standings = parseStandings(await fetchPage(season.path), season.legacyId, season.year);
    await writeJson(`standings-${season.year}.json`, standings);

    const roundCount = standings.sections.reduce((n, s) => n + s.columns.length, 0);
    const playerCount = standings.sections[0]?.rows.length ?? 0;
    console.log(`${season.year}: ${roundCount} runder, ${playerCount} spillere`);

    if (season.legacyId !== "2012") {
      const birdies = parseBirdies(await fetchPage(`birdielisten/${season.legacyId}`));
      await writeJson(`birdies-${season.year}.json`, birdies);

      const schedule = parseSchedule(await fetchPage(`turneringsplan/${season.legacyId}`));
      await writeJson(`schedule-${season.year}.json`, schedule);

      const pairs = new Set<string>();
      for (const section of standings.sections) {
        for (const row of section.rows) {
          for (const cell of row.cells) {
            if (cell.legacyRoundId && row.legacyPlayerId) {
              pairs.add(`${cell.legacyRoundId}/${row.legacyPlayerId}`);
            }
          }
        }
      }

      const cards: LegacyScorecard[] = [];
      for (const pair of pairs) {
        const [roundId, playerId] = pair.split("/");
        const card = parseScorecard(await fetchPage(`stilling/scorecard/${pair}`), roundId, playerId);
        if (card) cards.push(card);
      }
      await writeJson(`scorecards-${season.year}.json`, cards);
      console.log(`  ${cards.length} scorekort, ${birdies.length} på birdielisten, ${schedule.length} runder i planen`);
    }
  }

  await closeBrowser();
}

main().catch(async (err) => {
  console.error(err);
  await closeBrowser();
  process.exit(1);
});
