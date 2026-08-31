"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "./queries";

async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) throw new Error("Kun turneringsledelsen kan ændre det her.");
  return viewer;
}

export async function setRoundStatus(roundId: string, status: "scheduled" | "live" | "final") {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("rounds").update({ status }).eq("id", roundId);
  if (error) throw new Error(error.message);

  // Closing a round settles absences, places and the points it feeds forward.
  if (status === "final") {
    const { data } = await supabase.from("rounds").select("season_id").eq("id", roundId).maybeSingle();
    if (data?.season_id) await supabase.rpc("bo_recalculate_season", { p_season: data.season_id });
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/runde/${roundId}`);
  revalidatePath(`/live/${roundId}`);
}

export async function updateRoundPlayer(
  roundPlayerId: string,
  values: {
    handicap?: number | null;
    handicap_strokes?: number;
    flight?: number | null;
    marker_id?: string | null;
    status?: "playing" | "absent";
  },
) {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("round_players")
    .update(values)
    .eq("id", roundPlayerId)
    .select("round_id")
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (data?.round_id) {
    revalidatePath(`/admin/runde/${data.round_id}`);
    revalidatePath(`/live/${data.round_id}`);
  }
}

export async function recalculateSeason(seasonId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("bo_recalculate_season", { p_season: seasonId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
