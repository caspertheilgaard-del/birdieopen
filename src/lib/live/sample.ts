import type { LiveRound } from "./types";

/**
 * A round in progress, used to show the live screens without a database behind
 * them. The names, course and handicaps are the real finale field from 2026;
 * the hole scores are made up.
 */

const PAR = [4, 5, 4, 3, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 5];
const INDEX = [5, 11, 1, 15, 7, 3, 17, 9, 13, 6, 16, 2, 12, 4, 18, 8, 10, 14];

const HOLES = PAR.map((par, i) => ({ hole: i + 1, par, strokeIndex: INDEX[i] }));

type Seed = {
  name: string;
  slug: string;
  handicap: number;
  strokes: number;
  flight: number;
  /** Gross scores from hole 1 onward. */
  gross: number[];
};

const SEEDS: Seed[] = [
  { name: "Peter Meincke", slug: "peter-meincke", handicap: 12.4, strokes: 14, flight: 1,
    gross: [5, 6, 5, 3, 5, 5, 2, 6, 5, 4, 2, 5, 6, 5] },
  { name: "Anders Kristensen", slug: "anders-kristensen", handicap: 10.8, strokes: 12, flight: 1,
    gross: [4, 4, 6, 4, 5, 4, 3, 6, 5, 5, 2, 5, 6, 4] },
  { name: "Rasmus Opstrup", slug: "rasmus-opstrup", handicap: 14.1, strokes: 16, flight: 1,
    gross: [6, 6, 5, 2, 5, 5, 4, 6, 6, 5, 4, 6] },
  { name: "Jon Fogh", slug: "jon-fogh", handicap: 9.1, strokes: 11, flight: 2,
    gross: [5, 5, 5, 3, 4, 5, 2, 6, 5, 4, 3, 5, 4, 4] },
  { name: "Casper Theilgaard", slug: "casper-theilgaard", handicap: 17.2, strokes: 19, flight: 2,
    gross: [5, 7, 6, 4, 6, 5, 3, 6, 5, 6, 2, 5, 7] },
  { name: "Anders Schmidt", slug: "anders-schmidt", handicap: 15.6, strokes: 17, flight: 2,
    gross: [6, 6, 6, 3, 5, 6, 4, 7, 5, 5, 3, 6, 6] },
  { name: "Johan Dubbelman", slug: "johan-dubbelman", handicap: 13.9, strokes: 15, flight: 3,
    gross: [5, 6, 5, 4, 5, 5, 4, 6, 6, 5, 2, 5] },
  { name: "Rene Simonsen", slug: "rene-simonsen", handicap: 11.5, strokes: 13, flight: 3,
    gross: [5, 4, 6, 3, 5, 4, 4, 6, 5, 5, 3, 5] },
  { name: "René Lund", slug: "rene-lund", handicap: 16.3, strokes: 18, flight: 3,
    gross: [6, 7, 5, 4, 6, 5, 4, 7, 6, 5, 4, 6] },
  { name: "David Hjortbak", slug: "david-hjortbak", handicap: 18.4, strokes: 20, flight: 4,
    gross: [6, 6, 6, 4, 6, 6, 4, 7, 6, 6, 4, 6] },
  { name: "Emil Gregersen", slug: "emil-gregersen", handicap: 14.8, strokes: 16, flight: 4,
    gross: [5, 6, 6, 4, 5, 5, 2, 6, 6, 5, 3, 5] },
  { name: "Stefan Møller Jensen", slug: "stefan-moeller-jensen", handicap: 19.2, strokes: 21, flight: 4,
    gross: [6, 7, 6, 5, 6, 6, 4, 7, 7, 6, 4, 7] },
  { name: "Andreas Opstrup", slug: "andreas-opstrup", handicap: 13.1, strokes: 15, flight: 4,
    gross: [] },
];

/** The player whose phone we are looking at, and the marker for that flight. */
export const SAMPLE_VIEWER_ID = "player-casper-theilgaard";

export const SAMPLE_ROUND: LiveRound = {
  id: "sample",
  year: 2026,
  kind: "final",
  venue: "Gut Apeldör",
  courseName: "AC / Rød/Grøn",
  startsAt: "2026-08-30T08:30:00+02:00",
  status: "live",
  holes: HOLES,
  players: SEEDS.map((seed) => ({
    roundPlayerId: `rp-${seed.slug}`,
    playerId: `player-${seed.slug}`,
    name: seed.name,
    slug: seed.slug,
    handicap: seed.handicap,
    handicapStrokes: seed.strokes,
    flight: seed.flight,
    // Casper marks for his own flight, so the entry screen shows all three.
    markerId: seed.flight === 2 ? SAMPLE_VIEWER_ID : null,
    status: seed.gross.length === 0 ? "absent" : "playing",
    scores: Object.fromEntries(seed.gross.map((gross, i) => [i + 1, gross])),
  })),
};
