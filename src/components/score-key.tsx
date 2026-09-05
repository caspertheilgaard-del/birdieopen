import { grossClass, holeClass } from "@/lib/scoring";

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

const GROSS_STEPS: { gross: number; par: number; label: string }[] = [
  { gross: 1, par: 3, label: "Hole in one" },
  { gross: 2, par: 4, label: "Eagle" },
  { gross: 3, par: 4, label: "Birdie" },
  { gross: 4, par: 4, label: "Par" },
  { gross: 5, par: 4, label: "Bogey" },
  { gross: 6, par: 4, label: "Dobbelt +" },
];

/** The marks on the gross score, in the order a hole can go. */
export function GrossKey() {
  return (
    <div className="score-key gross-key">
      <span className="score-key__label">Slag på hullet</span>
      <span className="score-key__scale">
        {GROSS_STEPS.map((step) => (
          <span key={step.label} className="score-key__pair">
            <span className={grossClass(step.gross, step.par)}>{step.gross}</span>
            <span className="score-key__caption">{step.label}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
