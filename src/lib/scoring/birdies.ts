/**
 * The birdie list. An eagle (and a hole-in-one) counts as three birdies.
 * Ties go to the player whose birdies came on the hardest holes, meaning the
 * lowest sum of stroke indexes, and after that to the most points.
 */

export type BirdieEntry = {
  playerId: string;
  /** Stroke index of the hole. */
  key: number;
  /** Stableford points scored on that hole. */
  points: number;
  type: "birdie" | "eagle" | "albatross" | "hole-in-one";
};

export function birdieWeight(type: BirdieEntry["type"]): number {
  return type === "birdie" ? 1 : 3;
}

export type BirdieRow = {
  playerId: string;
  count: number;
  keySum: number;
  pointSum: number;
  place: number;
};

export function rankBirdies(entries: BirdieEntry[]): BirdieRow[] {
  const byPlayer = new Map<string, { count: number; keySum: number; pointSum: number }>();

  for (const entry of entries) {
    const row = byPlayer.get(entry.playerId) ?? { count: 0, keySum: 0, pointSum: 0 };
    row.count += birdieWeight(entry.type);
    row.keySum += entry.key;
    row.pointSum += entry.points;
    byPlayer.set(entry.playerId, row);
  }

  const rows = [...byPlayer.entries()].map(([playerId, row]) => ({ playerId, ...row }));
  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.keySum !== b.keySum) return a.keySum - b.keySum;
    return b.pointSum - a.pointSum;
  });

  const out: BirdieRow[] = [];
  let place = 0;
  let previous = "";
  rows.forEach((row, index) => {
    const signature = `${row.count}/${row.keySum}/${row.pointSum}`;
    if (signature !== previous) {
      place = index + 1;
      previous = signature;
    }
    out.push({ ...row, place });
  });

  return out;
}
