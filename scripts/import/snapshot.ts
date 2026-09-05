import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { normalize, slugify, type Normalized } from "./normalize";
import { strokesOnHole } from "../../src/lib/scoring";
import type {
  BirdieListRow,
  CourseDetail,
  HomeData,
  PlayerProfile,
  PlayerSummary,
  ScheduleRound,
  ScorecardView,
  SeasonStandings,
  SeasonSummary,
  StandingsRow,
  StandingsTable,
} from "../../src/lib/data/types";

/**
 * Builds the read models the pages use, straight from the normalized rows.
 * Writing them to a snapshot keeps the site renderable without a database, and
 * doubles as a check that the normalizer produced something coherent.
 */

export type Snapshot = {
  generatedAt: string;
  seasons: SeasonSummary[];
  standings: Record<string, SeasonStandings>;
  birdies: Record<string, BirdieListRow[]>;
  schedule: Record<string, ScheduleRound[]>;
  players: PlayerSummary[];
  courses: Record<string, CourseDetail>;
  profiles: Record<string, PlayerProfile>;
  scorecards: Record<string, ScorecardView>;
  home: HomeData;
};

function placeRows(rows: Omit<StandingsRow, "place" | "behind">[]): StandingsRow[] {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const leader = sorted[0]?.total ?? 0;
  let place = 0;
  let previous: number | null = null;
  return sorted.map((row, index) => {
    if (previous === null || row.total !== previous) {
      place = index + 1;
      previous = row.total;
    }
    return { ...row, place, behind: index === 0 ? null : leader - row.total };
  });
}

export function buildSnapshot(data: Normalized): Snapshot {
  const nameBySlug = new Map(data.players.map((p) => [p.slug, p.name]));
  const courseByKey = new Map(data.courses.map((c) => [c.key, c]));
  const roundsByYear = new Map<number, typeof data.rounds>();
  for (const round of data.rounds) {
    const list = roundsByYear.get(round.year) ?? [];
    list.push(round);
    roundsByYear.set(round.year, list);
  }

  const resultsByRound = new Map<string, Map<string, (typeof data.roundResults)[number]>>();
  for (const result of data.roundResults) {
    const map = resultsByRound.get(result.round_legacy_id) ?? new Map();
    map.set(result.player_slug, result);
    resultsByRound.set(result.round_legacy_id, map);
  }

  const scoredRounds = new Set(data.scores.map((s) => `${s.round_legacy_id}/${s.player_slug}`));
  const carryByYear = new Map<number, Map<string, number>>();
  for (const row of data.carryover) {
    const map = carryByYear.get(row.year) ?? new Map();
    map.set(row.player_slug, row.points);
    carryByYear.set(row.year, map);
  }

  const seasons: SeasonSummary[] = [...data.seasons]
    .sort((a, b) => b.year - a.year)
    .map((s) => ({ year: s.year, name: s.name, status: s.status }));

  const standings: Record<string, SeasonStandings> = {};
  const schedule: Record<string, ScheduleRound[]> = {};

  for (const season of seasons) {
    const rounds = (roundsByYear.get(season.year) ?? []).sort((a, b) => a.sequence - b.sequence);

    const buildTable = (kind: "prelim" | "final"): StandingsTable | null => {
      const columns = rounds.filter((r) => r.kind === kind);
      if (columns.length === 0) return null;

      const players = new Set<string>();
      for (const round of columns) {
        for (const slug of resultsByRound.get(round.legacy_id)?.keys() ?? []) players.add(slug);
      }
      if (players.size === 0) return null;

      const carry = carryByYear.get(season.year);
      const rows = [...players].map((slug) => {
        const cells = columns.map((round) => {
          const result = resultsByRound.get(round.legacy_id)?.get(slug);
          if (!result) return { value: null, stableford: null, average: false, scorecard: false };
          return {
            value: kind === "final" ? result.awarded : result.points,
            stableford: result.points,
            average: result.source === "average",
            scorecard: scoredRounds.has(`${round.legacy_id}/${slug}`),
          };
        });

        const carryover = kind === "final" ? (carry?.get(slug) ?? null) : null;
        const total =
          (carryover ?? 0) + cells.reduce((n, c) => n + (c.value ?? 0), 0);

        return {
          playerName: nameBySlug.get(slug) ?? slug,
          playerSlug: slug,
          carryover,
          cells,
          total,
        };
      });

      const placed = placeRows(rows);
      const title = data.titles.find((t) => t.year === season.year);
      if (kind === "final" && title) {
        const sharedFirst = placed.filter((row) => row.place === 1);
        if (sharedFirst.length > 1 && sharedFirst.some((row) => row.playerSlug === title.winner)) {
          for (const row of sharedFirst) {
            row.place = row.playerSlug === title.winner ? 1 : 2;
          }
          placed.sort((a, b) => a.place - b.place || b.total - a.total);
        }
      }

      return {
        kind,
        columns: columns.map((round) => ({
          roundId: round.legacy_id,
          venue: round.venue,
          courseName: round.course_key ? (courseByKey.get(round.course_key)?.name ?? null) : null,
          startsAt: round.starts_at,
          played: (resultsByRound.get(round.legacy_id)?.size ?? 0) > 0,
        })),
        rows: placed,
      };
    };

    standings[String(season.year)] = {
      year: season.year,
      prelim: buildTable("prelim"),
      final: buildTable("final"),
    };

    schedule[String(season.year)] = rounds.map((round) => {
      const course = round.course_key ? courseByKey.get(round.course_key) : null;
      const results = [...(resultsByRound.get(round.legacy_id)?.entries() ?? [])];
      const best = results
        .filter(([, r]) => r.source !== "average")
        .sort((a, b) => b[1].points - a[1].points)[0];

      return {
        roundId: round.legacy_id,
        kind: round.kind,
        startsAt: round.starts_at,
        venue: round.venue,
        courseName: course?.name ?? null,
        par: course?.par ?? null,
        lengthMeters: course?.length_meters ?? null,
        address: course?.address ?? null,
        sponsor: round.sponsor,
        status: round.status,
        winner: best
          ? { name: nameBySlug.get(best[0]) ?? best[0], slug: best[0], points: best[1].points }
          : null,
      };
    });
  }

  const birdies: Record<string, BirdieListRow[]> = {};
  for (const season of seasons) {
    const rows = new Map<string, BirdieListRow>();
    for (const birdie of data.birdies.filter((b) => b.year === season.year)) {
      const row = rows.get(birdie.player_slug) ?? {
        place: 0,
        playerName: nameBySlug.get(birdie.player_slug) ?? birdie.player_slug,
        playerSlug: birdie.player_slug,
        count: 0,
        keySum: 0,
        pointSum: 0,
        eagles: 0,
        details: [],
      };
      row.count += birdie.kind === "birdie" ? 1 : 3;
      if (birdie.kind !== "birdie") row.eagles += 1;
      row.keySum += birdie.stroke_index ?? 0;
      row.pointSum += birdie.points;
      row.details.push({
        hole: birdie.hole,
        courseLabel: birdie.course_label,
        strokeIndex: birdie.stroke_index,
        par: birdie.par,
        kind: birdie.kind,
      });
      rows.set(birdie.player_slug, row);
    }

    const list = [...rows.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.keySum !== b.keySum) return a.keySum - b.keySum;
      return b.pointSum - a.pointSum;
    });

    let place = 0;
    let previous = "";
    list.forEach((row, index) => {
      const signature = `${row.count}/${row.keySum}/${row.pointSum}`;
      if (signature !== previous) {
        place = index + 1;
        previous = signature;
      }
      row.place = place;
    });

    birdies[String(season.year)] = list;
  }

  const currentYear = seasons[0]?.year ?? new Date().getFullYear();
  const championOf = (kind: "champion" | "birdie_champion") => {
    const row = [...data.champions]
      .filter((c) => c.kind === kind)
      .sort((a, b) => b.year - a.year)[0];
    if (!row) return null;
    return {
      name: nameBySlug.get(row.player_slug) ?? row.player_slug,
      slug: row.player_slug,
      year: row.year,
    };
  };

  const currentSchedule = schedule[String(currentYear)] ?? [];
  const currentStandings = standings[String(currentYear)];
  const table = currentStandings?.final ?? currentStandings?.prelim ?? null;
  const finalRounds = currentSchedule.filter((r) => r.kind === "final");

  const home: HomeData = {
    season: seasons[0] ?? { year: currentYear, name: `Birdie Open ${currentYear}`, status: "active" },
    seasons,
    top: (table?.rows ?? []).slice(0, 5).map((row) => ({
      place: row.place,
      playerName: row.playerName,
      playerSlug: row.playerSlug,
      points: row.total,
      behind: row.behind ?? 0,
    })),
    finalRoundsPlayed: finalRounds.filter((r) => r.winner !== null).length,
    finalRoundsTotal: finalRounds.length,
    nextRound: currentSchedule.find((r) => r.winner === null) ?? null,
    liveRound: currentSchedule.find((r) => r.status === "live") ?? null,
    title: (() => {
      const row = data.titles.find((t) => t.year === currentYear);
      if (!row) return null;
      return {
        winnerName: nameBySlug.get(row.winner) ?? row.winner,
        winnerSlug: row.winner,
        tiedWith: row.tiedWith.map((slug) => nameBySlug.get(slug) ?? slug),
        note: row.note,
      };
    })(),
    champion: championOf("champion"),
    birdieChampion: championOf("birdie_champion"),
    stats: {
      seasonNumber: seasons.length,
      activePlayers: data.players.filter((p) => p.active).length,
      rounds: currentSchedule.length,
      birdies: data.birdies.filter((b) => b.year === currentYear).length,
    },
  };

  const badgeFor = (slug: string): string[] => {
    const out: string[] = [];
    if (home.champion?.slug === slug) out.push(`Mester ${home.champion.year}`);
    if (home.birdieChampion?.slug === slug) out.push(`Birdiemester ${home.birdieChampion.year}`);
    // Only worth saying while there is still a round to play.
    if (home.nextRound && home.top[0]?.playerSlug === slug) out.push(`Fører ${currentYear}`);
    return out;
  };

  const players: PlayerSummary[] = data.players.map((p) => ({
    name: p.name,
    slug: p.slug,
    active: p.active,
    badges: badgeFor(p.slug),
  }));

  // ---- scorecards ----------------------------------------------------
  const holesByCourse = new Map<string, Map<number, { par: number; strokeIndex: number }>>();
  for (const hole of data.courseHoles) {
    const map = holesByCourse.get(hole.course_key) ?? new Map();
    map.set(hole.hole, { par: hole.par, strokeIndex: hole.stroke_index });
    holesByCourse.set(hole.course_key, map);
  }

  const roundByLegacyId = new Map(data.rounds.map((r) => [r.legacy_id, r]));
  const roundPlayerIndex = new Map(
    data.roundPlayers.map((rp) => [`${rp.round_legacy_id}/${rp.player_slug}`, rp]),
  );

  const grossByCard = new Map<string, Map<number, number | null>>();
  for (const score of data.scores) {
    const key = `${score.round_legacy_id}/${score.player_slug}`;
    const map = grossByCard.get(key) ?? new Map();
    map.set(score.hole, score.gross);
    grossByCard.set(key, map);
  }

  const scorecards: Record<string, ScorecardView> = {};
  for (const [key, gross] of grossByCard) {
    const [roundId, slug] = key.split("/");
    const round = roundByLegacyId.get(roundId);
    if (!round) continue;
    const holeSpecs = round.course_key ? holesByCourse.get(round.course_key) : null;
    if (!holeSpecs || holeSpecs.size === 0) continue;

    const rp = roundPlayerIndex.get(key);
    const strokes = rp?.handicap_strokes ?? 0;

    let running = 0;
    const summary = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, worse: 0, blank: 0 };
    const holes = [...holeSpecs.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hole, spec]) => {
        const received = strokesOnHole(strokes, spec.strokeIndex, holeSpecs.size);
        const g = gross.get(hole) ?? null;
        const points = g === null || g <= 0 ? 0 : Math.max(0, 2 + spec.par - (g - received));
        running += points;

        if (g === null || g <= 0) summary.blank += 1;
        else if (g <= spec.par - 2) summary.eagles += 1;
        else if (g === spec.par - 1) summary.birdies += 1;
        else if (g === spec.par) summary.pars += 1;
        else if (g === spec.par + 1) summary.bogeys += 1;
        else summary.worse += 1;

        return { hole, par: spec.par, strokeIndex: spec.strokeIndex, strokes: received, gross: g, points, running };
      });

    const course = round.course_key ? courseByKey.get(round.course_key) : null;
    scorecards[`${round.year}/${roundId}/${slug}`] = {
      year: round.year,
      roundId,
      kind: round.kind,
      playerName: nameBySlug.get(slug) ?? slug,
      playerSlug: slug,
      venue: round.venue,
      courseName: course?.name ?? null,
      startsAt: round.starts_at,
      tee: course?.tee ?? null,
      handicap: rp?.handicap ?? null,
      handicapStrokes: strokes,
      total: holes.reduce((n, h) => n + h.points, 0),
      front: holes.filter((h) => h.hole <= 9).reduce((n, h) => n + h.points, 0),
      back: holes.filter((h) => h.hole > 9).reduce((n, h) => n + h.points, 0),
      holes,
      summary,
    };
  }

  // ---- player profiles -----------------------------------------------
  const profiles: Record<string, PlayerProfile> = {};
  for (const player of data.players) {
    const lines = seasons
      .map((season) => {
        const table = standings[String(season.year)];
        const prelimRow = table?.prelim?.rows.find((r) => r.playerSlug === player.slug) ?? null;
        const finalRow = table?.final?.rows.find((r) => r.playerSlug === player.slug) ?? null;
        if (!prelimRow && !finalRow) return null;

        // Every round the player actually walked, preliminary and final alike,
        // measured in the stableford it paid. A final round's cell carries the
        // placement points in `value`, so the score comes from `stableford`.
        const roundScores = [
          ...(prelimRow?.cells ?? [])
            .filter((c) => c.value !== null && !c.average)
            .map((c) => c.value as number),
          ...(finalRow?.cells ?? [])
            .filter((c) => c.stableford !== null && !c.average)
            .map((c) => c.stableford as number),
        ];
        const birdieRow = birdies[String(season.year)]?.find((b) => b.playerSlug === player.slug);

        return {
          year: season.year,
          prelimTotal: prelimRow?.total ?? null,
          prelimPlace: prelimRow?.place ?? null,
          finalTotal: finalRow?.total ?? null,
          finalPlace: finalRow?.place ?? null,
          roundsPlayed: roundScores.length,
          playedPoints: roundScores.reduce((n, p) => n + p, 0),
          bestRound: roundScores.length > 0 ? Math.max(...roundScores) : null,
          birdies: birdieRow?.count ?? 0,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    const bestRounds = lines.map((l) => l.bestRound).filter((v): v is number => v !== null);
    const roundsPlayed = lines.reduce((n, l) => n + l.roundsPlayed, 0);
    // The average covers rounds actually played, so an assigned absence score
    // does not flatter or punish anyone's average.
    const playedPoints = lines.reduce((n, l) => n + l.playedPoints, 0);

    profiles[player.slug] = {
      name: player.name,
      slug: player.slug,
      active: player.active,
      badges: badgeFor(player.slug),
      seasons: lines.map(({ playedPoints: _playedPoints, ...line }) => line),
      totals: {
        seasons: lines.length,
        roundsPlayed,
        points: playedPoints,
        birdies: lines.reduce((n, l) => n + l.birdies, 0),
        titles: data.champions.filter((c) => c.player_slug === player.slug && c.kind === "champion").length,
        bestRound: bestRounds.length > 0 ? Math.max(...bestRounds) : null,
        averageRound: roundsPlayed > 0 ? Math.round((playedPoints / roundsPlayed) * 10) / 10 : null,
      },
    };
  }

  // Courses with their hole details, so the app can set up a round from a
  // course and a tee without asking anyone to type eighteen pars in.
  const courses: Record<string, CourseDetail> = {};
  for (const course of data.courses) {
    const holes = [...(holesByCourse.get(course.key)?.entries() ?? [])]
      .map(([hole, spec]) => ({ hole, par: spec.par, strokeIndex: spec.strokeIndex }))
      .sort((a, b) => a.hole - b.hole);
    if (holes.length === 0) continue;
    courses[course.key] = {
      key: course.key,
      name: course.name,
      club: course.club,
      tee: course.tee,
      par: course.par,
      lengthMeters: course.length_meters,
      address: course.address,
      holes,
    };
  }

  // Courses typed in from a club scorecard win over the ones derived from the
  // old site, because they carry hole lengths and a course rating.
  for (const course of data.manualCourses) courses[course.key] = course;

  return {
    generatedAt: new Date().toISOString(),
    seasons,
    standings,
    birdies,
    schedule,
    players,
    courses,
    profiles,
    scorecards,
    home,
  };
}

async function main(): Promise<void> {
  const data = await normalize();
  const snapshot = buildSnapshot(data);
  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "snapshot.json"), `${JSON.stringify(snapshot)}\n`, "utf8");

  console.log(
    [
      `${data.players.length} spillere`,
      `${data.seasons.length} sæsoner`,
      `${data.courses.length} baner`,
      `${data.rounds.length} runder`,
      `${data.scores.length} hulscores`,
      `${data.birdies.length} birdies`,
    ].join(", "),
  );
  console.log(`Snapshot skrevet for ${snapshot.seasons.map((s) => s.year).join(", ")}`);
}

if (process.argv[1]?.endsWith("snapshot.ts")) main();
