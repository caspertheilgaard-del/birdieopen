/** Shapes of the raw data scraped off the old birdieopen.dk. Nothing is interpreted here. */

export type LegacySeason = {
  legacyId: string;
  year: number;
  label: string;
  path: string;
};

export type LegacyRoundColumn = {
  index: number;
  legacyRoundId: string | null;
  venue: string;
  when: string;
};

export type LegacyStandingCell = {
  columnIndex: number;
  value: number | null;
  /** Finals show "20 (34 point)": finalPoints 20, stableford 34. */
  stableford: number | null;
  /** Player did not play; the round average was assigned instead. */
  average: boolean;
  legacyRoundId: string | null;
};

export type LegacyStandingRow = {
  playerName: string;
  legacyPlayerId: string | null;
  carryover: number | null;
  cells: LegacyStandingCell[];
  total: number | null;
  behind: string;
  place: number | null;
};

export type LegacyStandingsSection = {
  kind: "prelim" | "final";
  tableId: string;
  columns: LegacyRoundColumn[];
  rows: LegacyStandingRow[];
};

export type LegacyStandings = {
  seasonLegacyId: string;
  year: number;
  sections: LegacyStandingsSection[];
};

export type LegacyHole = {
  hole: number;
  length: number | null;
  key: number | null;
  par: number | null;
  strokes: number | null;
  gross: number | null;
  points: number | null;
  running: number | null;
};

export type LegacyScorecard = {
  legacyRoundId: string;
  legacyPlayerId: string;
  tournament: string;
  playedAt: string;
  courseName: string;
  tee: string;
  playerName: string;
  golfbox: string;
  handicap: number | null;
  strokesReceived: number | null;
  total: number | null;
  holes: LegacyHole[];
};

export type LegacyBirdieDetail = {
  hole: number | null;
  courseLabel: string;
  key: number | null;
  /** The old site prints "(Nøgle 10, 3, Birdie)": the middle number is the
      stableford points scored on the hole, not the par. */
  points: number | null;
  type: string;
};

export type LegacyBirdieRow = {
  place: number | null;
  playerName: string;
  count: number | null;
  keySum: number | null;
  pointSum: number | null;
  details: LegacyBirdieDetail[];
};

export type LegacyScheduleRound = {
  group: "prelim" | "final";
  when: string;
  club: string;
  courseName: string;
  par: number | null;
  lengthMeters: number | null;
  address: string;
  winnerName: string | null;
  winnerPoints: number | null;
  sponsor: string;
};

export type LegacyPlayers = {
  active: string[];
  former: string[];
};
