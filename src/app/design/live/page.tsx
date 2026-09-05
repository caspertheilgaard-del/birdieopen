import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBoard } from "@/components/demo-board";
import { getSampleRound } from "@/lib/data";
import { longDate, timeOfDay } from "@/lib/format";
import type { LiveRound } from "@/lib/live/types";

export const metadata = { title: "Livescore, forhåndsvisning" };

/** Andreas Opstrup's phone, during the last round at Gut Apeldör. */
const VIEWER_SLUG = "andreas-opstrup";

export default async function LiveDesignPage() {
  const sample = await getSampleRound();
  if (!sample) notFound();

  const round: LiveRound = {
    id: "gut-apeldoer-finale",
    year: sample.year,
    kind: "final",
    venue: sample.venue,
    courseName: sample.courseName,
    startsAt: sample.startsAt,
    status: "live",
    holes: sample.holes,
    players: sample.players.map((player) => ({
      roundPlayerId: `rp-${player.slug}`,
      playerId: `player-${player.slug}`,
      name: player.name,
      slug: player.slug,
      handicap: player.handicap,
      handicapStrokes: player.handicapStrokes,
      flight: player.flight,
      markerId: null,
      status: "playing",
      scores: player.gross,
    })),
  };

  return (
    <main>
      <section className="live-head">
        <div className="live-head__inner">
          <span className="live-badge">
            <span className="live-badge__dot" aria-hidden="true" />
            Live nu
          </span>
          <h1 className="live-head__title">{sample.venue}</h1>
          <p className="live-head__meta">
            Sidste finalerunde ·{" "}
            {`${longDate(sample.startsAt)} ${timeOfDay(sample.startsAt)}`.trim()}
            {sample.courseName ? ` · ${sample.courseName}` : ""}
          </p>
          <div className="live-actions">
            <Link href="/design/runde" className="btn btn--primary">
              Sæt en runde op
            </Link>
            <Link href={`/stilling/${sample.year}`} className="btn btn--ghost">
              Stillingen {sample.year}
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap wrap--plan">
        <DemoBoard fallback={round} viewerId={`player-${VIEWER_SLUG}`} />
        <p className="footnote">
          Rigtige scores fra runden, standset undervejs: førebolden er nået 12 huller, de første ud
          er på 14. Din egen række er markeret i venstre kant, og F står der, når en runde er færdig.
        </p>
      </div>
    </main>
  );
}
