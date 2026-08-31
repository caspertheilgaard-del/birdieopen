import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/config";
import type { LiveRound, Viewer } from "./types";

/** The signed-in player, or null when nobody is signed in. */
export async function getViewer(): Promise<Viewer> {
  if (!hasSupabase) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("players")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { playerId: data.id, name: data.name, isAdmin: data.role === "admin" };
}

type RoundRow = {
  id: string;
  kind: "prelim" | "final";
  venue: string;
  starts_at: string | null;
  status: "scheduled" | "live" | "final";
  seasons: { year: number } | null;
  courses: {
    name: string;
    course_holes: { hole: number; par: number; stroke_index: number }[];
  } | null;
  round_players: {
    id: string;
    player_id: string;
    handicap: number | null;
    handicap_strokes: number;
    flight: number | null;
    marker_id: string | null;
    status: "playing" | "absent";
    players: { name: string; slug: string } | null;
    scores: { hole: number; gross: number | null }[];
  }[];
};

const ROUND_SELECT = `
  id, kind, venue, starts_at, status,
  seasons ( year ),
  courses ( name, course_holes ( hole, par, stroke_index ) ),
  round_players (
    id, player_id, handicap, handicap_strokes, flight, marker_id, status,
    players ( name, slug ),
    scores ( hole, gross )
  )
`;

function toLiveRound(row: RoundRow): LiveRound {
  const holes = (row.courses?.course_holes ?? [])
    .map((h) => ({ hole: h.hole, par: h.par, strokeIndex: h.stroke_index }))
    .sort((a, b) => a.hole - b.hole);

  const players = row.round_players
    .map((rp) => ({
      roundPlayerId: rp.id,
      playerId: rp.player_id,
      name: rp.players?.name ?? "Ukendt",
      slug: rp.players?.slug ?? "",
      handicap: rp.handicap,
      handicapStrokes: rp.handicap_strokes,
      flight: rp.flight,
      markerId: rp.marker_id,
      status: rp.status,
      scores: Object.fromEntries(rp.scores.map((s) => [s.hole, s.gross])) as Record<number, number | null>,
    }))
    .sort((a, b) => (a.flight ?? 99) - (b.flight ?? 99) || a.name.localeCompare(b.name, "da"));

  return {
    id: row.id,
    year: row.seasons?.year ?? new Date().getFullYear(),
    kind: row.kind,
    venue: row.venue,
    courseName: row.courses?.name ?? null,
    startsAt: row.starts_at,
    status: row.status,
    holes,
    players,
  };
}

export async function getLiveRound(roundId: string): Promise<LiveRound | null> {
  if (!hasSupabase) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("rounds").select(ROUND_SELECT).eq("id", roundId).maybeSingle();
  return data ? toLiveRound(data as unknown as RoundRow) : null;
}

export type RoundListItem = {
  id: string;
  year: number;
  venue: string;
  courseName: string | null;
  startsAt: string | null;
  status: "scheduled" | "live" | "final";
  kind: "prelim" | "final";
  players: number;
};

/** Rounds worth opening the app for: anything live, plus what is still to come. */
export async function getOpenRounds(): Promise<RoundListItem[]> {
  if (!hasSupabase) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("rounds")
    .select("id, kind, venue, starts_at, status, seasons ( year ), courses ( name ), round_players ( id )")
    .in("status", ["live", "scheduled"])
    .order("starts_at", { ascending: true });

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      kind: "prelim" | "final";
      venue: string;
      starts_at: string | null;
      status: "scheduled" | "live" | "final";
      seasons: { year: number } | null;
      courses: { name: string } | null;
      round_players: { id: string }[];
    };
    return {
      id: r.id,
      year: r.seasons?.year ?? new Date().getFullYear(),
      venue: r.venue,
      courseName: r.courses?.name ?? null,
      startsAt: r.starts_at,
      status: r.status,
      kind: r.kind,
      players: r.round_players.length,
    };
  });
}
