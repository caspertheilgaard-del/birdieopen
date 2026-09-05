import { hasSupabase } from "@/lib/supabase/config";
import * as db from "./db";
import * as snapshot from "./snapshot-source";
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
} from "./types";

export * from "./types";

/**
 * One source at a time. Without a Supabase project the site renders the
 * imported snapshot, which keeps the whole archive browsable on its own.
 */
const source = hasSupabase ? db : snapshot;

export async function getSeasons(): Promise<SeasonSummary[]> {
  return source.getSeasons();
}

export async function getCurrentSeason(): Promise<SeasonSummary> {
  const seasons = await getSeasons();
  return seasons.find((s) => s.status === "active") ?? seasons[0];
}

export async function getStandings(year: number): Promise<SeasonStandings | null> {
  return source.getStandings(year);
}

export async function getBirdieList(year: number): Promise<BirdieListRow[]> {
  return source.getBirdieList(year);
}

export async function getSchedule(year: number): Promise<ScheduleRound[]> {
  return source.getSchedule(year);
}

export async function getPlayers(): Promise<PlayerSummary[]> {
  return source.getPlayers();
}

export async function getHome(): Promise<HomeData> {
  return source.getHome();
}

export async function getPlayerProfile(slug: string): Promise<PlayerProfile | null> {
  return source.getPlayerProfile(slug);
}

export async function getPlayerSlugs(): Promise<string[]> {
  return source.getPlayerSlugs();
}

export async function getScorecard(
  year: number,
  roundId: string,
  slug: string,
): Promise<ScorecardView | null> {
  return source.getScorecard(year, roundId, slug);
}

export async function getScorecardKeys(): Promise<{ year: string; round: string; slug: string }[]> {
  return source.getScorecardKeys();
}

export async function getCourse(key: string): Promise<CourseDetail | null> {
  return source.getCourse(key);
}
