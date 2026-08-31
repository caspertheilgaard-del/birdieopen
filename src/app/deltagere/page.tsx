import Link from "next/link";
import { getPlayers } from "@/lib/data";
import { initials } from "@/lib/format";

export const metadata = { title: "Deltagere" };

export default async function PlayersPage() {
  const players = await getPlayers();
  const active = players.filter((p) => p.active);
  const former = players.filter((p) => !p.active);

  return (
    <main className="wrap wrap--deltagere">
      <h1 className="page-title">DELTAGERE</h1>
      <p className="page-note" style={{ marginBottom: 24 }}>
        {active.length} aktive deltagere. Kun med invitation.
      </p>

      <div className="player-grid">
        {active.map((player) => (
          <Link key={player.slug} href={`/spiller/${player.slug}`} className="player-card">
            <span className="avatar">{initials(player.name)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="player-card__name" style={{ display: "block" }}>
                {player.name}
              </span>
              {player.badges.map((badge) => (
                <span key={badge} className={`pill${badge.startsWith("Fører") ? " pill--lead" : ""}`}>
                  {badge}
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>

      {former.length > 0 ? (
        <>
          <h2 className="section-label" style={{ margin: "34px 0 12px" }}>
            Tidligere deltagere
          </h2>
          <div className="chips">
            {former.map((player) => (
              <span key={player.slug}>{player.name}</span>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
