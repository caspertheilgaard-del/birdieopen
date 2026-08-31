import { rankBy } from "./placement";

/**
 * Season maths for Birdie Open, following the rules in force from 2014.
 *
 * Both the carryover into the finals and the points inside each final round run
 * on a two-point scale: the leader gets twice the number of finalists, and every
 * place below drops two points. That is what the old site actually produced, and
 * the import is verified against it season by season.
 */

export type PlayerRoundScore = {
  playerId: string;
  /** Stableford points, or null when the player was absent. */
  points: number | null;
};

/** Round average, used to fill in an absent player's score (rule 12). */
export function roundAverage(scores: PlayerRoundScore[]): number {
  const played = scores.filter((s) => s.points !== null).map((s) => s.points as number);
  if (played.length === 0) return 0;
  return Math.round(played.reduce((n, p) => n + p, 0) / played.length);
}

/** Penalty applied to the average, by how many rounds the player has missed. */
export function absencePenalty(absenceNumber: number): number {
  if (absenceNumber <= 1) return 0;
  if (absenceNumber === 2) return 2;
  if (absenceNumber === 3) return 3;
  if (absenceNumber === 4) return 4;
  return 5;
}

/** Score assigned to an absent player: the round average, less the penalty. */
export function absenceScore(average: number, absenceNumber: number): number {
  return Math.max(0, average - absencePenalty(absenceNumber));
}

/**
 * Points carried from the preliminary rounds into the finals.
 * Leader gets finalists * 2, each place below drops 2, with a floor of
 * max minus the points for winning a final round (rule 6).
 */
export function carryoverPoints(place: number, finalists: number): number {
  const max = finalists * 2;
  const min = max - finalists;
  return Math.max(min, max - 2 * (place - 1));
}

/**
 * The scale used inside a final round. Through 2022 a win was worth the number
 * of finalists and each place dropped one point. From 2023 the tournament
 * doubled it: a win is worth twice the finalists and each place drops two.
 * The points carried in from the preliminary rounds have always used the
 * doubled scale, which is why the two differ for the older seasons.
 */
export function finalScaleForYear(year: number): 1 | 2 {
  return year >= 2023 ? 2 : 1;
}

export function finalRoundPoints(place: number, finalists: number, scale: 1 | 2 = 2): number {
  return Math.max(0, finalists * scale - scale * (place - 1));
}

export type CarryoverRow = { playerId: string; prelimTotal: number; place: number; carryover: number };

export function computeCarryover(
  prelimTotals: { playerId: string; total: number }[],
  finalists: string[],
): CarryoverRow[] {
  const inFinal = prelimTotals.filter((p) => finalists.includes(p.playerId));
  return rankBy(inFinal, (p) => p.total).map((p) => ({
    playerId: p.playerId,
    prelimTotal: p.total,
    place: p.place,
    carryover: carryoverPoints(p.place, finalists.length),
  }));
}

export function computeFinalRound(
  scores: { playerId: string; points: number }[],
  finalists: number,
  scale: 1 | 2 = 2,
): { playerId: string; points: number; place: number; awarded: number }[] {
  return rankBy(scores, (s) => s.points).map((s) => ({
    playerId: s.playerId,
    points: s.points,
    place: s.place,
    awarded: finalRoundPoints(s.place, finalists, scale),
  }));
}
