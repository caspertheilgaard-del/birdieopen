import { holeClass } from "@/lib/scoring";

/** Explains the colours once, so the scorecard and the keypad need no captions. */
export function ScoreKey() {
  return (
    <div className="score-key">
      <span className="score-key__label">Point pr. hul</span>
      <span className="score-key__scale">
        {[0, 1, 2, 3, 4, 5].map((points) => (
          <span key={points} className={holeClass(points)}>
            {points === 5 ? "5+" : points}
          </span>
        ))}
      </span>
      <span className="score-key__note">
        To point er lige på hullet. Alt derover er bedre end par og står rødt, ligesom en runde over
        36 point.
      </span>
    </div>
  );
}
