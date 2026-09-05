import Link from "next/link";
import { notFound } from "next/navigation";
import { getScorecard } from "@/lib/data";
import { longDate, timeOfDay } from "@/lib/format";
import type { ScorecardHole } from "@/lib/data";
import { LEVEL_PER_ROUND, grossClass, grossName, holeClass } from "@/lib/scoring";
import { GrossKey, ScoreKey } from "@/components/score-key";

type Params = { year: string; round: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { year, round, slug } = await params;
  const card = await getScorecard(Number(year), round, slug);
  return { title: card ? `Scorekort · ${card.playerName} · ${card.venue}` : "Scorekort" };
}

function Nine({ holes, label }: { holes: ScorecardHole[]; label: string }) {
  return (
    <tr className="is-turn">
      <td>{label}</td>
      <td>{holes.reduce((n, h) => n + h.par, 0)}</td>
      <td />
      <td>{holes.reduce((n, h) => n + h.strokes, 0)}</td>
      <td>{holes.reduce((n, h) => n + (h.gross ?? 0), 0)}</td>
      <td>{holes.reduce((n, h) => n + h.points, 0)}</td>
      <td>{holes[holes.length - 1]?.running ?? 0}</td>
    </tr>
  );
}

export default async function ScorecardPage({ params }: { params: Promise<Params> }) {
  const { year, round, slug } = await params;
  const card = await getScorecard(Number(year), round, slug);
  if (!card) notFound();

  const front = card.holes.filter((h) => h.hole <= 9);
  const back = card.holes.filter((h) => h.hole > 9);

  return (
    <main className="wrap wrap--plan">
      <Link className="back-link" href={`/stilling/${card.year}?visning=${card.kind === "final" ? "finale" : "indledende"}`}>
        ← Stillingen {card.year}
      </Link>

      <div className="card-head">
        <div>
          <h1 className="page-title">{card.playerName}</h1>
          <div className="meta-list">
            <span>
              <strong>{card.venue}</strong>
              {card.courseName ? ` · ${card.courseName}` : ""}
            </span>
            <span>{`${longDate(card.startsAt)} ${timeOfDay(card.startsAt)}`.trim()}</span>
            {card.tee ? <span>Tee {card.tee}</span> : null}
            {card.handicap !== null ? <span>Hcp. {card.handicap}</span> : null}
            <span>{card.handicapStrokes} tildelte slag</span>
          </div>
        </div>
        <div className="card-head__total">
          <div className="eyebrow">Stableford</div>
          <div className={`card-head__total-value${card.total > LEVEL_PER_ROUND ? " is-ahead" : ""}`}>
            {card.total}
          </div>
          <div className="card-head__total-note">
            {card.total > LEVEL_PER_ROUND
              ? `${card.total - LEVEL_PER_ROUND} over 36`
              : card.total === LEVEL_PER_ROUND
                ? "Lige på 36"
                : `${LEVEL_PER_ROUND - card.total} under 36`}
          </div>
        </div>
      </div>

      <div className="panel">
        <table className="table table--scorecard">
          <thead>
            <tr>
              <th>Hul</th>
              <th className="is-center">Par</th>
              <th className="is-center">Nøgle</th>
              <th className="is-center">Slag</th>
              <th className="is-center">Score</th>
              <th className="is-points">Point</th>
              <th className="is-center">I alt</th>
            </tr>
          </thead>
          <tbody>
            {front.map((hole) => (
              <HoleRow key={hole.hole} hole={hole} />
            ))}
            <Nine holes={front} label="Ud" />
            {back.map((hole) => (
              <HoleRow key={hole.hole} hole={hole} />
            ))}
            <Nine holes={back} label="Ind" />
          </tbody>
        </table>
      </div>

      <GrossKey />
      <ScoreKey />

      <div className="summary-grid">
        <div>
          <strong>{card.summary.eagles}</strong>
          <span>Eagles</span>
        </div>
        <div>
          <strong>{card.summary.birdies}</strong>
          <span>Birdies</span>
        </div>
        <div>
          <strong>{card.summary.pars}</strong>
          <span>Par</span>
        </div>
        <div>
          <strong>{card.summary.bogeys}</strong>
          <span>Bogeys</span>
        </div>
        <div>
          <strong>{card.summary.worse}</strong>
          <span>Dobbelt +</span>
        </div>
        <div>
          <strong>
            {card.front} / {card.back}
          </strong>
          <span>Ud / ind</span>
        </div>
      </div>
    </main>
  );
}

function HoleRow({ hole }: { hole: ScorecardHole }) {
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{hole.hole}</td>
      <td>{hole.par}</td>
      <td style={{ color: "var(--text-faint)" }}>{hole.strokeIndex}</td>
      <td className="strokes-dot">{hole.strokes > 0 ? "•".repeat(hole.strokes) : ""}</td>
      <td>
        <span className={grossClass(hole.gross, hole.par)} title={grossName(hole.gross, hole.par)}>
          {hole.gross ?? "–"}
        </span>
      </td>
      <td>
        <span className={holeClass(hole.gross === null || hole.gross <= 0 ? null : hole.points)}>
          {hole.gross === null || hole.gross <= 0 ? "–" : hole.points}
        </span>
      </td>
      <td style={{ color: "var(--text-faint)" }}>{hole.running}</td>
    </tr>
  );
}
