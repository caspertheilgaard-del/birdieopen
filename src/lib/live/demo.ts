"use client";

import type { LiveRound } from "./types";

/**
 * The demo round, kept in the browser so the setup, the score entry and the
 * leaderboard all look at the same thing. A real round lives in the database;
 * this is only here so the screens can be tried without one.
 */

const KEY = "birdieopen.demo-round";

export function loadDemoRound(): LiveRound | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LiveRound) : null;
  } catch {
    return null;
  }
}

export function saveDemoRound(round: LiveRound): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(round));
    window.dispatchEvent(new CustomEvent("birdieopen:demo-round"));
  } catch {
    // private window, or storage is full; the screen still works for this visit
  }
}

export function clearDemoRound(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("birdieopen:demo-round"));
  } catch {
    // nothing to clear
  }
}

export function recordDemoScore(roundPlayerId: string, hole: number, gross: number | null): void {
  const round = loadDemoRound();
  if (!round) return;
  saveDemoRound({
    ...round,
    players: round.players.map((player) =>
      player.roundPlayerId === roundPlayerId
        ? { ...player, scores: { ...player.scores, [hole]: gross } }
        : player,
    ),
  });
}

/** Fires when the round changes, including from another tab. */
export function onDemoRoundChange(handler: () => void): () => void {
  window.addEventListener("birdieopen:demo-round", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("birdieopen:demo-round", handler);
    window.removeEventListener("storage", handler);
  };
}
