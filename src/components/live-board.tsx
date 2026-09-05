"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildLeaderboard } from "@/lib/live/leaderboard";
import { formatLevel, levelDiff } from "@/lib/scoring";
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
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.roundPlayerId}
                className={[row.place === 1 ? "is-leader" : "", row.playerId === viewerId ? "is-me" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td>
                  <span className={row.place === 1 ? "place place--1" : row.place <= 3 ? "place place--2" : "place"}>
                    {row.place}
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
              </tr>
            ))}
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
