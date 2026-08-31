import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/live/queries";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/config";
import { longDate, timeOfDay } from "@/lib/format";

export const metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Planlagt",
  live: "Åben for indtastning",
  final: "Afsluttet",
};

export default async function AdminPage() {
  if (!hasSupabase) {
    return (
      <main className="wrap wrap--plan">
        <h1 className="page-title">ADMINISTRATION</h1>
        <div className="notice" style={{ marginTop: 20 }}>Databasen er ikke koblet på endnu.</div>
      </main>
    );
  }

  const viewer = await getViewer();
  if (!viewer) redirect("/log-ind?retur=/admin");
  if (!viewer.isAdmin) {
    return (
      <main className="wrap wrap--plan">
        <h1 className="page-title">ADMINISTRATION</h1>
        <div className="notice" style={{ marginTop: 20 }}>
          Kun turneringsledelsen har adgang her.
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("rounds")
    .select("id, kind, venue, starts_at, status, sequence, seasons ( year, status )")
    .order("starts_at", { ascending: true });

  const rounds = (data ?? []) as unknown as {
    id: string;
    kind: "prelim" | "final";
    venue: string;
    starts_at: string | null;
    status: string;
    sequence: number;
    seasons: { year: number; status: string } | null;
  }[];

  const current = rounds.filter((r) => r.seasons?.status === "active");
  const shown = current.length > 0 ? current : rounds.slice(-12);

  return (
    <main className="wrap wrap--plan">
      <h1 className="page-title">ADMINISTRATION</h1>
      <p className="page-note" style={{ marginBottom: 24 }}>
        Logget ind som {viewer.name}. Åbn en runde, når bolden går ud, og luk den når alle er inde.
      </p>

      <div className="round-list">
        {shown.map((round) => (
          <div key={round.id} className={`round-card${round.status === "live" ? " is-next" : ""}`}>
            <div className="round-card__body">
              <div className="round-card__venue">{round.venue}</div>
              <div className="round-card__meta">
                {round.seasons?.year} ·{" "}
                {round.kind === "final" ? "Finalerunde" : "Indledende runde"} {round.sequence} ·{" "}
                {`${longDate(round.starts_at)} ${timeOfDay(round.starts_at)}`.trim()}
              </div>
            </div>
            <div className="chip">
              <span className="chip__label">{STATUS_LABEL[round.status] ?? round.status}</span>
            </div>
            <Link href={`/admin/runde/${round.id}`} className="btn btn--dark">
              Åbn
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
