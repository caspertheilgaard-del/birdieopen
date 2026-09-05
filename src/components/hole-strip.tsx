import { grossClass, grossName, holeClass, holePoints, strokesOnHole } from "@/lib/scoring";
import type { LiveHole, LivePlayer } from "@/lib/live/types";

/**
 * A player's card as far as they have got: hole, gross with its mark, and the
 * points it paid. Nine holes at a time so it reads on a phone, with the turn
 * and the running total where a paper card would have them.
 */
export function HoleStrip({ holes, player }: { holes: LiveHole[]; player: LivePlayer }) {
  const played = holes.filter((hole) => {
    const gross = player.scores[hole.hole];
    return gross !== undefined && gross !== null && gross > 0;
  });

  if (played.length === 0) {
    return <p className="hole-strip__empty">Ingen huller tastet endnu.</p>;
  }

  const rows = (from: number, to: number) => played.filter((h) => h.hole >= from && h.hole <= to);
  const nines = [
    { label: "Ud", holes: rows(1, 9) },
    { label: "Ind", holes: rows(10, 18) },
  ].filter((nine) => nine.holes.length > 0);

  const pointsFor = (hole: LiveHole) => {
    const gross = player.scores[hole.hole] ?? null;
    return holePoints(gross, hole.par, strokesOnHole(player.handicapStrokes, hole.strokeIndex, holes.length));
  };

  const total = played.reduce((sum, hole) => sum + pointsFor(hole), 0);

  return (
    <div className="hole-strip">
      {nines.map((nine) => (
        <table key={nine.label} className="hole-strip__table">
          <tbody>
            <tr className="hole-strip__heads">
              <th scope="row">Hul</th>
              {nine.holes.map((hole) => (
                <td key={hole.hole}>{hole.hole}</td>
              ))}
              <td className="hole-strip__sum">{nine.label}</td>
            </tr>
            <tr>
              <th scope="row">Slag</th>
              {nine.holes.map((hole) => {
                const gross = player.scores[hole.hole] ?? null;
                return (
                  <td key={hole.hole}>
                    <span className={grossClass(gross, hole.par)} title={grossName(gross, hole.par)}>
                      {gross}
                    </span>
                  </td>
                );
              })}
              <td className="hole-strip__sum">
                {nine.holes.reduce((sum, hole) => sum + (player.scores[hole.hole] ?? 0), 0)}
              </td>
            </tr>
            <tr>
              <th scope="row">Point</th>
              {nine.holes.map((hole) => (
                <td key={hole.hole}>
                  <span className={holeClass(pointsFor(hole))}>{pointsFor(hole)}</span>
                </td>
              ))}
              <td className="hole-strip__sum">
                {nine.holes.reduce((sum, hole) => sum + pointsFor(hole), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      ))}

      <p className="hole-strip__foot">
        {played.length} {played.length === 1 ? "hul" : "huller"} · {total} point ·{" "}
        {player.handicapStrokes} tildelte slag
        {player.handicap !== null ? ` fra handicap ${player.handicap}` : ""}
      </p>
    </div>
  );
}
