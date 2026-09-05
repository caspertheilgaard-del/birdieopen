import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ScoreEntry } from "@/components/score-entry";
import { getLiveRound, getViewer } from "@/lib/live/queries";
import { longDate, timeOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Nothing to prerender: these ids only exist once a database is connected. */
export async function generateStaticParams() {
  return [];
}

type Params = { round: string };

export const metadata = { title: "Tast scores" };

export default async function ScoreEntryPage({ params }: { params: Promise<Params> }) {
  const { round: roundId } = await params;
  const [round, viewer] = await Promise.all([getLiveRound(roundId), getViewer()]);
  if (!round) notFound();
  if (!viewer) redirect(`/log-ind?retur=/live/${roundId}/kort`);

  return (
    <main>
      <section className="live-head">
        <div className="live-head__inner">
          <h1 className="live-head__title" style={{ fontSize: "clamp(26px,5vw,40px)", marginTop: 0 }}>
            {round.venue}
          </h1>
          <p className="live-head__meta">
            {`${longDate(round.startsAt)} ${timeOfDay(round.startsAt)}`.trim()}
            {round.courseName ? ` · ${round.courseName}` : ""}
          </p>
        </div>
      </section>

      {round.status !== "live" ? (
        <div className="entry">
          <div className="notice">
            Runden er ikke åben for indtastning. Turneringsledelsen åbner den, når der spilles.{" "}
            <Link href={`/live/${round.id}`}>Se livescoren</Link>.
          </div>
        </div>
      ) : (
        <ScoreEntry round={round} viewerId={viewer.playerId} isAdmin={viewer.isAdmin} />
      )}
    </main>
  );
}
