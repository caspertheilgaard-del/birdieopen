/**
 * Stableford scoring. A player's handicap strokes are spread across the holes by
 * stroke index: everybody gets floor(strokes / 18) on every hole, and the
 * remainder goes to the hardest holes first.
 */

export type HoleSpec = {
  hole: number;
  par: number;
  /** Stroke index, 1 = hardest. Called "nøgle" on the scorecards. */
  key: number;
};

export function strokesOnHole(handicapStrokes: number, key: number, holeCount = 18): number {
  if (handicapStrokes <= 0 || key < 1) return 0;
  const base = Math.floor(handicapStrokes / holeCount);
  const extra = handicapStrokes - base * holeCount;
  return base + (key <= extra ? 1 : 0);
}

/** Stableford points for one hole. A blank or picked-up score scores nothing. */
export function holePoints(gross: number | null, par: number, strokesReceived: number): number {
  if (gross === null || gross <= 0) return 0;
  const net = gross - strokesReceived;
  return Math.max(0, 2 + par - net);
}

export type HoleScore = {
  hole: number;
  gross: number | null;
  strokes: number;
  points: number;
};

/** Scores a full or partial round. Holes without a gross score count as zero. */
export function scoreRound(
  holes: HoleSpec[],
  gross: Record<number, number | null>,
  handicapStrokes: number,
): { holes: HoleScore[]; total: number; front: number; back: number; played: number } {
  const scored = holes.map((h) => {
    const strokes = strokesOnHole(handicapStrokes, h.key, holes.length);
    const g = gross[h.hole] ?? null;
    return { hole: h.hole, gross: g, strokes, points: holePoints(g, h.par, strokes) };
  });

  const sum = (list: HoleScore[]) => list.reduce((n, h) => n + h.points, 0);
  const half = Math.ceil(holes.length / 2);

  return {
    holes: scored,
    total: sum(scored),
    front: sum(scored.filter((_, i) => i < half)),
    back: sum(scored.filter((_, i) => i >= half)),
    played: scored.filter((h) => h.gross !== null && h.gross > 0).length,
  };
}

/** Relative to par across the holes played, for the live leaderboard. */
export function toPar(holes: HoleScore[], specs: HoleSpec[]): number {
  const parByHole = new Map(specs.map((s) => [s.hole, s.par]));
  return holes.reduce((n, h) => {
    if (h.gross === null || h.gross <= 0) return n;
    return n + (h.gross - (parByHole.get(h.hole) ?? 0));
  }, 0);
}
