import { loadSnapshot } from "./snapshot";
import type {
  BirdieListRow,
  CourseDetail,
  HomeData,
  PlayerProfile,
  PlayerSummary,
  ScheduleRound,
  SampleRound,
  ScorecardView,
  SeasonStandings,
  SeasonSummary,
} from "./types";

export async function getSeasons(): Promise<SeasonSummary[]> {
  return (await loadSnapshot()).seasons;
}

export async function getStandings(year: number): Promise<SeasonStandings | null> {
  return (await loadSnapshot()).standings[String(year)] ?? null;
}

export async function getBirdieList(year: number): Promise<BirdieListRow[]> {
  return (await loadSnapshot()).birdies[String(year)] ?? [];
}

export async function getSchedule(year: number): Promise<ScheduleRound[]> {
  return (await loadSnapshot()).schedule[String(year)] ?? [];
}

export async function getPlayers(): Promise<PlayerSummary[]> {
  return (await loadSnapshot()).players;
}

export async function getHome(): Promise<HomeData> {
  return (await loadSnapshot()).home;
}

export async function getPlayerProfile(slug: string): Promise<PlayerProfile | null> {
  return (await loadSnapshot()).profiles[slug] ?? null;
}

export async function getPlayerSlugs(): Promise<string[]> {
  return Object.keys((await loadSnapshot()).profiles);
}

export async function getScorecard(
  year: number,
  roundId: string,
  slug: string,
): Promise<ScorecardView | null> {
  return (await loadSnapshot()).scorecards[`${year}/${roundId}/${slug}`] ?? null;
}

/** Every scorecard in the archive, for prerendering a fully static build. */
export async function getScorecardKeys(): Promise<{ year: string; round: string; slug: string }[]> {
  const snapshot = await loadSnapshot();
  return Object.keys(snapshot.scorecards).map((key) => {
    const [year, round, slug] = key.split("/");
    return { year, round, slug };
  });
}

export async function getCourse(key: string): Promise<CourseDetail | null> {
  return (await loadSnapshot()).courses[key] ?? null;
}

/**
 * A round frozen partway through, built from the scorecards of the last final
 * round at Gut Apeldör. The leaders tee off last, so they are the fewest holes
 * in, which is what makes a leaderboard worth watching.
 */
export async function getSampleRound(): Promise<SampleRound | null> {
  const snapshot = await loadSnapshot();
  const cards = Object.entries(snapshot.scorecards)
    .filter(([key]) => key.startsWith("2026/158/"))
    .map(([, card]) => card);
  if (cards.length === 0) return null;

  const course = snapshot.courses[`${cards[0].courseName}|${cards[0].tee ?? ""}`] ?? null;
  const holes =
    course?.holes ??
    cards[0].holes.map((hole) => ({ hole: hole.hole, par: hole.par, strokeIndex: hole.strokeIndex }));

  // Tee order for a final round: last placed out first, leaders out last.
  const standings = snapshot.standings["2026"]?.final?.rows ?? [];
  const rank = new Map(standings.map((row, position) => [row.playerSlug, position]));
  const order = [...cards].sort(
    (a, b) => (rank.get(b.playerSlug) ?? 0) - (rank.get(a.playerSlug) ?? 0),
  );

  return {
    venue: cards[0].venue,
    courseName: cards[0].courseName,
    startsAt: cards[0].startsAt,
    year: cards[0].year,
    holes,
    players: order.map((card, position) => {
      const flight = Math.floor(position / 4) + 1;
      const thru = flight === 1 ? 14 : flight === 2 ? 13 : 12;
      return {
        slug: card.playerSlug,
        name: card.playerName,
        handicap: card.handicap,
        handicapStrokes: card.handicapStrokes,
        flight,
        thru,
        gross: Object.fromEntries(
          card.holes.filter((hole) => hole.hole <= thru).map((hole) => [hole.hole, hole.gross]),
        ) as Record<number, number | null>,
      };
    }),
  };
}
