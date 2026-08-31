import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveBoard } from "@/components/live-board";
import { getLiveRound, getViewer } from "@/lib/live/queries";
import { longDate, timeOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { round: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { round } = await params;
  const data = await getLiveRound(round);
  return { title: data ? `Livescore · ${data.venue}` : "Livescore" };
}

export default async function LiveRoundPage({ params }: { params: Promise<Params> }) {
  const { round: roundId } = await params;
  const [round, viewer] = await Promise.all([getLiveRound(roundId), getViewer()]);
  if (!round) notFound();

  const canScore =
    viewer !== null &&
    round.status === "live" &&
    (viewer.isAdmin ||
      round.players.some((p) => p.playerId === viewer.playerId || p.markerId === viewer.playerId));

  return (
    <main>
      <section className="live-head">
        <div className="live-head__inner">
          <span className="live-badge">
            <span className="live-badge__dot" aria-hidden="true" />
            {round.status === "live" ? "Live nu" : round.status === "final" ? "Afsluttet" : "Endnu ikke spillet"}
          </span>
          <h1 className="live-head__title">{round.venue.toUpperCase()}</h1>
          <p className="live-head__meta">
            {[
              round.kind === "final" ? "Finalerunde" : "Indledende runde",
              `${longDate(round.startsAt)} ${timeOfDay(round.startsAt)}`.trim(),
              round.courseName,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="live-actions">
            {canScore ? (
              <Link href={`/live/${round.id}/kort`} className="btn btn--primary">
                Tast scores
              </Link>
            ) : null}
            <Link href={`/stilling/${round.year}`} className="btn btn--ghost">
              Stillingen {round.year}
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap wrap--plan">
        <LiveBoard round={round} viewerId={viewer?.playerId ?? null} />
      </div>
    </main>
  );
}
