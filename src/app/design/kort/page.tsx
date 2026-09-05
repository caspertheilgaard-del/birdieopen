import { ScoreEntry } from "@/components/score-entry";
import { SAMPLE_ROUND, SAMPLE_VIEWER_ID } from "@/lib/live/sample";
import { longDate, timeOfDay } from "@/lib/format";

export const metadata = { title: "Indtastning, forhåndsvisning" };

/** Score entry on sample data. Casper marks for his own flight, so all three show. */
export default function ScoreEntryDesignPage() {
  const round = SAMPLE_ROUND;

  return (
    <main>
      <section className="live-head">
        <div className="live-head__inner">
          <h1 className="live-head__title" style={{ fontSize: "clamp(26px,5vw,40px)", marginTop: 0 }}>
            {round.venue}
          </h1>
          <p className="live-head__meta">
            {`${longDate(round.startsAt)} ${timeOfDay(round.startsAt)}`.trim()} · {round.courseName}
          </p>
        </div>
      </section>

      <ScoreEntry round={round} viewerId={SAMPLE_VIEWER_ID} isAdmin={false} />

      <p className="preview-note">
        Forhåndsvisning med opdigtede scores. Her taster man for hele bolden, fordi man er markør.
        Taster man kun for sig selv, står der ét kort.
      </p>
    </main>
  );
}
