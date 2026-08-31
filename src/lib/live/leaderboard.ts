import { holePoints, strokesOnHole } from "@/lib/scoring";
import type { LeaderboardRow, LiveHole, LivePlayer } from "./types";

/**
 * Builds the live leaderboard from raw scores. Runs on the client too, so a
 * score typed on the course updates the board before the database answers.
 */
export function buildLeaderboard(holes: LiveHole[], players: LivePlayer[]): LeaderboardRow[] {
  const rows = players.map((player) => {
    let points = 0;
    let front = 0;
    let back = 0;
    let thru = 0;
    let toPar = 0;
    let birdies = 0;

    for (const hole of holes) {
      const gross = player.scores[hole.hole] ?? null;
      if (gross === null || gross <= 0) continue;

      const received = strokesOnHole(player.handicapStrokes, hole.strokeIndex, holes.length);
      const scored = holePoints(gross, hole.par, received);

      points += scored;
      if (hole.hole <= 9) front += scored;
      else back += scored;
      thru += 1;
      toPar += gross - hole.par;
      if (gross <= hole.par - 1) birdies += 1;
    }

    return {
      roundPlayerId: player.roundPlayerId,
      playerId: player.playerId,
      name: player.name,
      slug: player.slug,
      points,
      front,
      back,
      thru,
      toPar,
      birdies,
      place: 0,
      flight: player.flight,
      status: player.status,
    };
  });

  // Most points first. Two players level on points are split on the back nine,
  // matching how a round winner is decided.
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.back !== a.back) return b.back - a.back;
    return b.thru - a.thru;
  });

  let place = 0;
  let previous: number | null = null;
  rows.forEach((row, index) => {
    if (previous === null || row.points !== previous) {
      place = index + 1;
      previous = row.points;
    }
    row.place = place;
  });

  return rows;
}

export function formatToPar(value: number): string {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : String(value);
}
