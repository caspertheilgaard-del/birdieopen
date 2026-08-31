import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerProfile, getPlayerSlugs } from "@/lib/data";
import { initials } from "@/lib/format";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return (await getPlayerSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const profile = await getPlayerProfile(slug);
  return { title: profile?.name ?? "Deltager" };
}

export default async function PlayerPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const profile = await getPlayerProfile(slug);
  if (!profile) notFound();

  const { totals } = profile;

  return (
    <main className="wrap wrap--plan">
      <Link className="back-link" href="/deltagere">
        ← Deltagere
      </Link>

      <div className="profile-head">
        <span className="avatar">{initials(profile.name)}</span>
        <div>
          <h1 className="page-title">{profile.name.toUpperCase()}</h1>
          <p className="page-note">
            {profile.active ? "Aktiv deltager" : "Tidligere deltager"} · {totals.seasons}{" "}
            {totals.seasons === 1 ? "sæson" : "sæsoner"}
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <div>
          <strong>{totals.titles}</strong>
          <span>Titler</span>
        </div>
        <div>
          <strong>{totals.roundsPlayed}</strong>
          <span>Runder spillet</span>
        </div>
        <div>
          <strong>{totals.bestRound ?? "–"}</strong>
          <span>Bedste runde</span>
        </div>
        <div>
          <strong>{totals.averageRound ?? "–"}</strong>
          <span>Snit pr. runde</span>
        </div>
        <div>
          <strong>{totals.birdies}</strong>
          <span>Birdies</span>
        </div>
        <div>
          <strong>{totals.points.toLocaleString("da-DK")}</strong>
          <span>Point i alt</span>
        </div>
      </div>

      <h2 className="section-label" style={{ margin: "30px 0 12px" }}>
        Sæson for sæson
      </h2>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Sæson</th>
              <th className="is-center">Runder</th>
              <th className="is-center">Indledende</th>
              <th className="is-center">Placering</th>
              <th className="is-center">Finalen</th>
              <th className="is-center">Placering</th>
              <th className="is-center">Bedste runde</th>
              <th className="is-points">Birdies</th>
            </tr>
          </thead>
          <tbody>
            {profile.seasons.map((line) => (
              <tr key={line.year}>
                <td className="cell-name">
                  <Link href={`/stilling/${line.year}`}>{line.year}</Link>
                </td>
                <td className="cell-score">{line.roundsPlayed}</td>
                <td className="cell-score">{line.prelimTotal ?? "–"}</td>
                <td className="cell-score" style={{ color: "var(--text-faint)" }}>
                  {line.prelimPlace ?? "–"}
                </td>
                <td className="cell-score">{line.finalTotal ?? "–"}</td>
                <td className="cell-score" style={{ color: "var(--text-faint)" }}>
                  {line.finalPlace ?? "–"}
                </td>
                <td className="cell-score">{line.bestRound ?? "–"}</td>
                <td className="cell-total">{line.birdies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
