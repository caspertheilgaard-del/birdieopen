import Link from "next/link";
import { getSchedule, getSeasons } from "@/lib/data";

export const metadata = { title: "Sponsorer" };

export default async function SponsorsPage() {
  const seasons = await getSeasons();
  const perSeason = await Promise.all(
    seasons.map(async (season) => ({
      season,
      rounds: (await getSchedule(season.year)).filter((r) => r.sponsor),
    })),
  );
  const withSponsors = perSeason.filter((s) => s.rounds.length > 0);

  return (
    <main className="wrap wrap--plan">
      <h1 className="page-title">Sponsorer</h1>
      <p className="page-note" style={{ marginBottom: 24 }}>
        Runder med en sponsor bag sig, sæson for sæson.
      </p>

      {withSponsors.length === 0 ? (
        <div className="card rules-card">
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-body)" }}>
            Der er ingen sponsorer registreret endnu. Når en runde får en sponsor, vises den her og på{" "}
            <Link href="/turneringsplan">turneringsplanen</Link>.
          </p>
        </div>
      ) : (
        withSponsors.map(({ season, rounds }) => (
          <section key={season.year} style={{ marginBottom: 28 }}>
            <h2 className="section-label">{season.year}</h2>
            <div className="round-list">
              {rounds.map((round) => (
                <div key={round.roundId} className="round-card">
                  <div className="round-card__body">
                    <div className="round-card__venue">{round.sponsor}</div>
                    <div className="round-card__meta">
                      {round.venue}
                      {round.courseName ? ` · ${round.courseName}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
