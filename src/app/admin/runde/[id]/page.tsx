import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RoundAdmin } from "@/components/round-admin";
import { getLiveRound, getViewer } from "@/lib/live/queries";
import { hasSupabase } from "@/lib/supabase/config";
import { longDate, timeOfDay } from "@/lib/format";

export const metadata = { title: "Runde" };
export const dynamic = "force-dynamic";

export default async function AdminRoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSupabase) notFound();

  const viewer = await getViewer();
  if (!viewer) redirect(`/log-ind?retur=/admin/runde/${id}`);
  if (!viewer.isAdmin) {
    return (
      <main className="wrap wrap--plan">
        <div className="notice" style={{ marginTop: 20 }}>Kun turneringsledelsen har adgang her.</div>
      </main>
    );
  }

  const round = await getLiveRound(id);
  if (!round) notFound();

  return (
    <main className="wrap wrap--plan">
      <Link className="back-link" href="/admin">
        ← Administration
      </Link>
      <h1 className="page-title">{round.venue.toUpperCase()}</h1>
      <p className="page-note" style={{ marginBottom: 20 }}>
        {`${longDate(round.startsAt)} ${timeOfDay(round.startsAt)}`.trim()}
        {round.courseName ? ` · ${round.courseName}` : ""} · {round.holes.length} huller registreret
      </p>

      {round.holes.length === 0 ? (
        <div className="notice">
          Banen mangler par og nøgle pr. hul. Uden dem kan stableford ikke regnes, og indtastning vil
          give nul point.
        </div>
      ) : null}

      <RoundAdmin round={round} />
    </main>
  );
}
