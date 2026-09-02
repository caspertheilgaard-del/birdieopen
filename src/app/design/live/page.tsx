import Link from "next/link";
import { LiveBoard } from "@/components/live-board";
import { SAMPLE_ROUND, SAMPLE_VIEWER_ID } from "@/lib/live/sample";
import { longDate, timeOfDay } from "@/lib/format";

export const metadata = { title: "Livescore, forhåndsvisning" };

/** The live leaderboard on sample data, so the screen can be seen without a database. */
export default function LiveDesignPage() {
  const round = SAMPLE_ROUND;

  return (
    <main>
      <section className="live-head">
        <div className="live-head__inner">
          <span className="live-badge">
            <span className="live-badge__dot" aria-hidden="true" />
            Live nu
          </span>
          <h1 className="live-head__title">{round.venue.toUpperCase()}</h1>
          <p className="live-head__meta">
            Finalerunde · {`${longDate(round.startsAt)} ${timeOfDay(round.startsAt)}`.trim()} ·{" "}
            {round.courseName}
          </p>
          <div className="live-actions">
            <Link href="/design/kort" className="btn btn--primary">
              Tast scores
            </Link>
            <Link href={`/stilling/${round.year}`} className="btn btn--ghost">
              Stillingen {round.year}
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap wrap--plan">
        <LiveBoard round={round} viewerId={SAMPLE_VIEWER_ID} />
        <p className="footnote">
          Boldene går ud efter placering, så førebolden er nederst på listen indtil scorene tikker
          ind. Din egen række er markeret i venstre kant. Thru viser hvor mange huller der er tastet,
          og F når runden er færdig.
        </p>
      </div>

      <p className="preview-note">
        Forhåndsvisning med opdigtede scores. Rigtige navne og handicap, så skærmen kan ses uden en
        runde i gang.
      </p>
    </main>
  );
}
