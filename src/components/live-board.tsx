"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildLeaderboard } from "@/lib/live/leaderboard";
import { formatLevel, formatPlace, levelDiff, tiedPlaces } from "@/lib/scoring";
import { HoleStrip } from "@/components/hole-strip";
import type { LiveRound } from "@/lib/live/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

type ScoreRow = { round_player_id: string; hole: number; gross: number | null };
type ScoreChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: ScoreRow;
  old?: ScoreRow;
};

/**
 * The live leaderboard. Recalculates locally from raw scores, and listens for
 * score changes so a board left open on a phone keeps itself current.
 */
export function LiveBoard({ round, viewerId }: { round: LiveRound; viewerId: string | null }) {
  const [players, setPlayers] = useState(round.players);
  // With no project configured there is nothing to wait for, so the board starts
  // as live. That also keeps the server-rendered markup right in the design export.
  const [connected, setConnected] = useState(!hasSupabase);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setPlayers(round.players);
  }, [round.players]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const ids = new Set(round.players.map((p) => p.roundPlayerId));

    const channel = supabase
      .channel(`round-${round.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        (payload: ScoreChange) => {
          const row = (payload.new ?? payload.old) as ScoreRow | undefined;
          if (!row || !ids.has(row.round_player_id)) return;

          setPlayers((current) =>
            current.map((player) =>
              player.roundPlayerId === row.round_player_id
                ? {
                    ...player,
                    scores: {
                      ...player.scores,
                      [row.hole]: payload.eventType === "DELETE" ? null : row.gross,
                    },
                  }
                : player,
            ),
          );
        },
      )
      .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [round.id, round.players]);

  const rows = useMemo(() => buildLeaderboard(round.holes, players), [round.holes, players]);
  const tied = useMemo(() => tiedPlaces(rows.map((row) => row.place)), [rows]);
  const holeCount = round.holes.length || 18;

  return (
    <>
      <div className={`sync${connected ? "" : " sync--pending"}`}>
        <span className="sync__dot" aria-hidden="true" />
        {connected ? "Opdaterer live" : "Forbinder…"}
      </div>

      <div className="panel">
        <table className="board">
          <thead>
            <tr>
              <th>#</th>
              <th>Deltager</th>
              <th className="is-points">Point</th>
              <th>Thru</th>
              <th>Mod par</th>
              <th>Birdies</th>
              <th><span className="sr-only">Scorekort</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => [
              <tr
                key={row.roundPlayerId}
                className={[row.place === 1 ? "is-leader" : "", row.playerId === viewerId ? "is-me" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td>
                  <span className={row.place === 1 ? "place place--1" : row.place <= 3 ? "place place--2" : "place"}>
                    {formatPlace(row.place, tied)}
                  </span>
                </td>
                <td className="board__name">
                  <Link href={`/spiller/${row.slug}`} style={{ color: "inherit" }}>
                    {row.name}
                  </Link>
                  {row.status === "absent" ? (
                    <span style={{ color: "var(--text-faint)", fontWeight: 400 }}> · afbud</span>
                  ) : null}
                </td>
                <td className={`board__points${levelDiff(row.points, row.thru) > 0 ? " is-ahead" : ""}`}>
                  {row.points}
                </td>
                <td className="board__thru">{row.thru === holeCount ? "F" : row.thru || "–"}</td>
                <td className={levelDiff(row.points, row.thru) > 0 ? "is-ahead" : undefined}>
                  {row.thru > 0 ? formatLevel(levelDiff(row.points, row.thru)) : "–"}
                </td>
                <td>{row.birdies}</td>
                <td>
                  <button
                    type="button"
                    className="card-toggle"
                    aria-expanded={open === row.roundPlayerId}
                    aria-controls={`kort-${row.roundPlayerId}`}
                    aria-label={`Scorekort for ${row.name}`}
                    onClick={() =>
                      setOpen((current) => (current === row.roundPlayerId ? null : row.roundPlayerId))
                    }
                  >
                    <svg width="11" height="7" viewBox="0 0 11 7" aria-hidden="true" focusable="false">
                      <path
                        d={open === row.roundPlayerId ? "M1.5 5.5l4-4 4 4" : "M1.5 1.5l4 4 4-4"}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </td>
              </tr>,
              <tr
                key={`${row.roundPlayerId}-kort`}
                id={`kort-${row.roundPlayerId}`}
                hidden={open !== row.roundPlayerId}
                className="detail-row"
              >
                <td colSpan={7}>
                  <HoleStrip
                    holes={round.holes}
                    player={players.find((p) => p.roundPlayerId === row.roundPlayerId)!}
                  />
                </td>
              </tr>,
            ])}
          </tbody>
        </table>
      </div>

      <p className="footnote">
        Mod par er de point, man ligger ud over to pr. hul. Efter 18 huller er det scoren mod 36.
        Rødt er bedre end par, ligesom på scorekortet.
      </p>
    </>
  );
}
