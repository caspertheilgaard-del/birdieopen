"use client";

import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Golf courses are not known for their coverage. Every score is written to a
 * local queue first, shown immediately, and pushed to the database as soon as
 * there is a connection again.
 */

export type PendingScore = {
  roundPlayerId: string;
  hole: number;
  gross: number | null;
  enteredBy: string;
  at: number;
};

const KEY = "birdieopen.pending-scores";

function read(): PendingScore[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as PendingScore[];
  } catch {
    return [];
  }
}

function write(items: PendingScore[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function pendingScores(): PendingScore[] {
  return read();
}

/** Queues one hole. A later entry for the same hole replaces the earlier one. */
export function queueScore(score: Omit<PendingScore, "at">): void {
  const items = read().filter(
    (item) => !(item.roundPlayerId === score.roundPlayerId && item.hole === score.hole),
  );
  items.push({ ...score, at: Date.now() });
  write(items);
}

export type FlushResult = { sent: number; remaining: number; error: string | null };

export async function flushScores(): Promise<FlushResult> {
  const items = read();
  if (items.length === 0) return { sent: 0, remaining: 0, error: null };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { sent: 0, remaining: items.length, error: null };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { sent: 0, remaining: items.length, error: null };

  const { error } = await supabase.from("scores").upsert(
    items.map((item) => ({
      round_player_id: item.roundPlayerId,
      hole: item.hole,
      gross: item.gross,
      entered_by: item.enteredBy,
    })),
    { onConflict: "round_player_id,hole" },
  );

  if (error) return { sent: 0, remaining: items.length, error: error.message };

  // Anything queued while the request was in flight stays behind.
  const cutoff = items[items.length - 1].at;
  const left = read().filter((item) => item.at > cutoff);
  write(left);
  return { sent: items.length, remaining: left.length, error: null };
}
