import Link from "next/link";
import { getOpenRounds, getViewer } from "@/lib/live/queries";
import { hasSupabase } from "@/lib/supabase/config";
import { dayAndMonth, longDate, timeOfDay } from "@/lib/format";

export const metadata = { title: "Live" };

export default async function LiveIndex() {
  if (!hasSupabase) {
    return (
      <main className="wrap wrap--plan">
        <h1 className="page-title">Live</h1>
        <p className="page-note" style={{ marginBottom: 20 }}>
          Under en runde bliver scores tastet ind på mobilen, og stillingen opdaterer sig selv.
          Skærmene virker, men de skal have en database bag sig for at vise en rigtig runde. Indtil
          da kan de ses med opdigtede scores.
        </p>
        <div className="live-actions" style={{ marginTop: 0 }}>
          <Link href="/design/runde" className="btn btn--primary">
            Prøv en runde
          </Link>
          <Link href="/design/live" className="btn btn--dark">
            Se livescoren
          </Link>
          <Link href="/design/kort" className="btn btn--dark">
            Se indtastningen
          </Link>
        </div>
      </main>
    );
  }

  const [rounds, viewer] = await Promise.all([getOpenRounds(), getViewer()]);

  return (
    <main className="wrap wrap--plan">
      <h1 className="page-title">Live</h1>
      <p className="page-note" style={{ marginBottom: 24 }}>
        {viewer ? `Logget ind som ${viewer.name}.` : "Log ind for at taste scores."}{" "}
        {viewer ? null : <Link href="/log-ind">Log ind</Link>}
      </p>

      {rounds.length === 0 ? (
        <div className="card rules-card">
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-body)" }}>
            Der er ingen åbne runder lige nu. Se <Link href="/turneringsplan">turneringsplanen</Link>{" "}
            for hvornår der spilles næste gang.
          </p>
        </div>
      ) : (
        <div className="round-list">
          {rounds.map((round) => {
            const date = dayAndMonth(round.startsAt);
            return (
              <div key={round.id} className={`round-card${round.status === "live" ? " is-next" : ""}`}>
                <div className="date-block">
                  <div className="date-block__day">{date.day}</div>
                  <div className="date-block__month">{date.month}</div>
                </div>
                <div className="round-card__body">
                  <div className="round-card__venue">{round.venue}</div>
                  <div className="round-card__meta">
                    {`${longDate(round.startsAt)} ${timeOfDay(round.startsAt)}`.trim()}
                    {round.courseName ? ` · ${round.courseName}` : ""} · {round.players} deltagere
                  </div>
                </div>
                <div className="live-actions" style={{ marginTop: 0 }}>
                  <Link href={`/live/${round.id}`} className="btn btn--dark">
                    Livescore
                  </Link>
                  {round.status === "live" && viewer ? (
                    <Link href={`/live/${round.id}/kort`} className="btn btn--dark">
                      Tast scores
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
