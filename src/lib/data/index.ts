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

export * from "./types";

export async function getSeasons(): Promise<SeasonSummary[]> {
  return (await loadSnapshot()).seasons;
}

export async function getCurrentSeason(): Promise<SeasonSummary> {
  const seasons = await getSeasons();
  return seasons.find((s) => s.status === "active") ?? seasons[0];
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

export async function getScorecardsForRound(year: number, roundId: string): Promise<ScorecardView[]> {
  const snapshot = await loadSnapshot();
  return Object.entries(snapshot.scorecards)
    .filter(([key]) => key.startsWith(`${year}/${roundId}/`))
    .map(([, card]) => card)
    .sort((a, b) => b.total - a.total);
}
