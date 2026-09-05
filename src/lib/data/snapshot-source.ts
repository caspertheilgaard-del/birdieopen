import { loadSnapshot } from "./snapshot";
import type {
  BirdieListRow,
  HomeData,
  PlayerProfile,
  PlayerSummary,
  ScheduleRound,
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
