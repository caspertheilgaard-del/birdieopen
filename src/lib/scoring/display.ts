/**
 * How a stableford score is coloured.
 *
 * Two points is level on a hole and 36 is level for a round, so anything above
 * that is the stableford equivalent of being under par: it goes red. The same
 * scale is used on the scorecard, on the keypad during a round, and in the
 * season standings, so a number means the same thing everywhere on the site.
 */

export const LEVEL_PER_HOLE = 2;
export const LEVEL_PER_ROUND = 36;

/** Class for one hole's points. Null means the hole has not been played. */
export function holeClass(points: number | null): string {
  if (points === null) return "pts pts--blank";
  if (points >= 5) return "pts pts--5";
  if (points === 4) return "pts pts--4";
  if (points === 3) return "pts pts--3";
  if (points === 2) return "pts pts--2";
  if (points === 1) return "pts pts--1";
  return "pts pts--0";
}

/** Points above or below level for the holes played so far. */
export function levelDiff(points: number, holesPlayed: number): number {
  return points - LEVEL_PER_HOLE * holesPlayed;
}

/** "+3" when ahead of level, "E" when level, "-2" when behind. */
export function formatLevel(diff: number): string {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : String(diff);
}

export function isAhead(diff: number): boolean {
  return diff > 0;
}

/**
 * A round is judged against 36, which is what playing to your handicap pays.
 * The scale runs from an exceptional round down to a poor one, so a season of
 * scores can be read as a shape rather than as a wall of numbers.
 */
export function roundClass(points: number | null): string {
  if (points === null) return "rd rd--none";
  if (points >= LEVEL_PER_ROUND + 5) return "rd rd--great";
  if (points > LEVEL_PER_ROUND) return "rd rd--good";
  if (points === LEVEL_PER_ROUND) return "rd rd--level";
  if (points >= LEVEL_PER_ROUND - 4) return "rd rd--under";
  return "rd rd--poor";
}

/** Points above or below 36 for every round counted, across a season. */
export function seasonVsHandicap(total: number, roundsCounted: number): number {
  return total - LEVEL_PER_ROUND * roundsCounted;
}
