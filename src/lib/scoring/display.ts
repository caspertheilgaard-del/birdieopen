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

/** A round total is judged against 36. */
export function roundClass(points: number | null): string {
  if (points === null) return "";
  if (points > LEVEL_PER_ROUND) return "is-ahead";
  return "";
}
