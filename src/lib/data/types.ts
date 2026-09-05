/** View models the pages render. Both the database and the local snapshot produce these. */

export type SeasonSummary = {
  year: number;
  name: string;
  status: "planned" | "active" | "complete";
};

export type StandingsColumn = {
  roundId: string;
  venue: string;
  courseName: string | null;
  startsAt: string | null;
  played: boolean;
};

export type StandingsCell = {
  /** Preliminary rounds show the stableford score; finals show the points won. */
  value: number | null;
  stableford: number | null;
  average: boolean;
  scorecard: boolean;
};

export type StandingsRow = {
  place: number;
  playerName: string;
  playerSlug: string;
  carryover: number | null;
  cells: StandingsCell[];
  total: number;
  behind: number | null;
};

export type StandingsTable = {
  kind: "prelim" | "final";
  columns: StandingsColumn[];
  rows: StandingsRow[];
};

export type SeasonStandings = {
  year: number;
  prelim: StandingsTable | null;
  final: StandingsTable | null;
};

export type BirdieListRow = {
  place: number;
  playerName: string;
  playerSlug: string;
  count: number;
  keySum: number;
  pointSum: number;
  eagles: number;
  details: { hole: number | null; courseLabel: string; strokeIndex: number | null; par: number | null; kind: string }[];
};

export type ScheduleRound = {
  roundId: string;
  kind: "prelim" | "final";
  startsAt: string | null;
  venue: string;
  courseName: string | null;
  par: number | null;
  lengthMeters: number | null;
  address: string | null;
  sponsor: string | null;
  status: "scheduled" | "live" | "final";
  winner: { name: string; slug: string; points: number } | null;
};

export type PlayerSummary = {
  name: string;
  slug: string;
  active: boolean;
  badges: string[];
};

export type HomeData = {
  season: SeasonSummary;
  seasons: SeasonSummary[];
  top: { place: number; playerName: string; playerSlug: string; points: number; behind: number }[];
  finalRoundsPlayed: number;
  finalRoundsTotal: number;
  nextRound: ScheduleRound | null;
  liveRound: ScheduleRound | null;
  /** Set when the season's first place was decided on a playoff hole. */
  playoff: { winnerName: string; winnerSlug: string; against: string[]; note: string } | null;
  champion: { name: string; slug: string; year: number } | null;
  birdieChampion: { name: string; slug: string; year: number } | null;
  stats: { seasonNumber: number; activePlayers: number; rounds: number; birdies: number };
};

export type ScorecardHole = {
  hole: number;
  par: number;
  strokeIndex: number;
  strokes: number;
  gross: number | null;
  points: number;
  running: number;
};

export type ScorecardView = {
  year: number;
  roundId: string;
  kind: "prelim" | "final";
  playerName: string;
  playerSlug: string;
  venue: string;
  courseName: string | null;
  startsAt: string | null;
  tee: string | null;
  handicap: number | null;
  handicapStrokes: number;
  total: number;
  front: number;
  back: number;
  holes: ScorecardHole[];
  summary: { eagles: number; birdies: number; pars: number; bogeys: number; worse: number; blank: number };
};

export type PlayerSeasonLine = {
  year: number;
  prelimTotal: number | null;
  prelimPlace: number | null;
  finalTotal: number | null;
  finalPlace: number | null;
  roundsPlayed: number;
  bestRound: number | null;
  birdies: number;
};

export type PlayerProfile = {
  name: string;
  slug: string;
  active: boolean;
  badges: string[];
  seasons: PlayerSeasonLine[];
  totals: {
    seasons: number;
    roundsPlayed: number;
    points: number;
    birdies: number;
    titles: number;
    bestRound: number | null;
    averageRound: number | null;
  };
};
