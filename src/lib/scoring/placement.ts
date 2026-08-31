/**
 * Placement with shared places. Two players on the same score get the same
 * place, and the next place is skipped: 1, 2, 2, 4.
 */

export type Ranked<T> = T & { place: number };

export function rankBy<T>(items: T[], score: (item: T) => number): Ranked<T>[] {
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  const out: Ranked<T>[] = [];
  let place = 0;
  let previous: number | null = null;

  sorted.forEach((item, index) => {
    const value = score(item);
    if (previous === null || value !== previous) {
      place = index + 1;
      previous = value;
    }
    out.push({ ...item, place });
  });

  return out;
}

/**
 * Round winner. Ties on total are broken on the best back nine and then on the
 * lowest handicap. This decides prizes only, never points (rule 11).
 */
export function roundWinner<T extends { total: number; back: number; handicap: number | null }>(
  players: T[],
): T | null {
  if (players.length === 0) return null;
  return [...players].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.back !== a.back) return b.back - a.back;
    return (a.handicap ?? 99) - (b.handicap ?? 99);
  })[0];
}
