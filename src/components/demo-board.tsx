"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LiveBoard } from "@/components/live-board";
import { clearDemoRound, loadDemoRound, onDemoRoundChange } from "@/lib/live/demo";
import type { LiveRound } from "@/lib/live/types";
import { longDate, timeOfDay } from "@/lib/format";

/**
 * The leaderboard for whichever round is being played. A round set up on this
 * device wins; otherwise it falls back to a finished field so the screen has
 * something to show.
 */
export function DemoBoard({ fallback, viewerId }: { fallback: LiveRound; viewerId: string }) {
  const [round, setRound] = useState<LiveRound | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => setRound(loadDemoRound());
    read();
    setReady(true);
    return onDemoRoundChange(read);
  }, []);

  const live = round ?? fallback;
  const isOwn = round !== null;
  const me = isOwn ? (round.players.find((p) => p.markerId === null)?.playerId ?? viewerId) : viewerId;

  return (
    <>
      <div className="board-source">
        <span>
          {!ready
            ? "Henter runden…"
            : isOwn
              ? `Din runde: ${live.venue}, ${longDate(live.startsAt)} ${timeOfDay(live.startsAt)}`.trim()
              : "Eksempel med opdigtede scores. Sæt en runde op, så står din egen her."}
        </span>
        {isOwn ? (
          <button type="button" className="link-button" onClick={() => clearDemoRound()}>
            Nulstil
          </button>
        ) : (
          <Link className="link-button" href="/design/runde">
            Sæt en runde op
          </Link>
        )}
      </div>

      <LiveBoard key={live.id + live.players.length} round={live} viewerId={me} />
    </>
  );
}
