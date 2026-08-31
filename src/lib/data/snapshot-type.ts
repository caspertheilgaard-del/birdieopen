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

export type Snapshot = {
  generatedAt: string;
  seasons: SeasonSummary[];
  standings: Record<string, SeasonStandings>;
  birdies: Record<string, BirdieListRow[]>;
  schedule: Record<string, ScheduleRound[]>;
  players: PlayerSummary[];
  profiles: Record<string, PlayerProfile>;
  /** Keyed by `year/roundId/playerSlug`. */
  scorecards: Record<string, ScorecardView>;
  home: HomeData;
};
