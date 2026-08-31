export type LiveHole = { hole: number; par: number; strokeIndex: number };

export type LivePlayer = {
  roundPlayerId: string;
  playerId: string;
  name: string;
  slug: string;
  handicap: number | null;
  handicapStrokes: number;
  flight: number | null;
  markerId: string | null;
  status: "playing" | "absent";
  /** Gross score by hole. A missing hole has not been played yet. */
  scores: Record<number, number | null>;
};

export type LiveRound = {
  id: string;
  year: number;
  kind: "prelim" | "final";
  venue: string;
  courseName: string | null;
  startsAt: string | null;
  status: "scheduled" | "live" | "final";
  holes: LiveHole[];
  players: LivePlayer[];
};

export type LeaderboardRow = {
  roundPlayerId: string;
  playerId: string;
  name: string;
  slug: string;
  points: number;
  front: number;
  back: number;
  thru: number;
  toPar: number;
  birdies: number;
  place: number;
  flight: number | null;
  status: "playing" | "absent";
};

export type Viewer = {
  playerId: string;
  name: string;
  isAdmin: boolean;
} | null;
