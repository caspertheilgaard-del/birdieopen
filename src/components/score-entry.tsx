"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LEVEL_PER_HOLE, holeClass, holePoints, strokesOnHole } from "@/lib/scoring";
import { ScoreKey } from "@/components/score-key";
import { flushScores, pendingScores, queueScore } from "@/lib/live/offline";
import type { LiveRound } from "@/lib/live/types";

/**
 * One hole at a time, big targets, readable in sunlight. A player enters their
 * own score, and whoever is marking the flight enters for everyone in it.
 */
export function ScoreEntry({
  round,
  viewerId,
  isAdmin,
}: {
  round: LiveRound;
  viewerId: string;
  isAdmin: boolean;
}) {
  const editable = useMemo(
    () =>
      round.players.filter(
        (player) =>
          player.status === "playing" &&
          (isAdmin || player.playerId === viewerId || player.markerId === viewerId),
      ),
    [round.players, viewerId, isAdmin],
  );

  const [scores, setScores] = useState<Record<string, Record<number, number | null>>>(() =>
    Object.fromEntries(round.players.map((p) => [p.roundPlayerId, { ...p.scores }])),
  );

  // Start on the first hole nobody in the flight has finished.
  const [hole, setHole] = useState(() => {
    for (const spec of round.holes) {
      if (editable.some((p) => (p.scores[spec.hole] ?? null) === null)) return spec.hole;
    }
    return round.holes[0]?.hole ?? 1;
  });

  const [pending, setPending] = useState(0);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    const result = await flushScores();
    setPending(result.remaining);
    setError(result.error);
  }, []);

  useEffect(() => {
    setPending(pendingScores().length);
    const online = () => {
      setOffline(false);
      void sync();
    };
    const gone = () => setOffline(true);

    setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", gone);
    const timer = window.setInterval(() => void sync(), 15000);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", gone);
      window.clearInterval(timer);
    };
  }, [sync]);

  const spec = round.holes.find((h) => h.hole === hole) ?? round.holes[0];
  const index = round.holes.findIndex((h) => h.hole === hole);

  const setScore = (roundPlayerId: string, gross: number | null) => {
    setScores((current) => ({
      ...current,
      [roundPlayerId]: { ...current[roundPlayerId], [hole]: gross },
    }));
    queueScore({ roundPlayerId, hole, gross, enteredBy: viewerId });
    setPending(pendingScores().length);
    void sync();
  };

  if (!spec) return <p className="page-note">Banen mangler huldata. Kontakt turneringsledelsen.</p>;
  if (editable.length === 0) {
    return (
      <div className="notice">
        Du er hverken tilmeldt denne runde eller markør for nogen i den, så du kan ikke taste scores.
        Du kan følge med på <Link href={`/live/${round.id}`}>livescoren</Link>.
      </div>
    );
  }

  // A par-4 is scored from an ace up to a triple bogey; beyond that the hole is picked up.
  const options = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(
    (value) => value >= 1 && value <= spec.par + 4,
  );

  return (
    <div className="entry">
      <div className={`sync${offline ? " sync--offline" : pending > 0 ? " sync--pending" : ""}`}>
        <span className="sync__dot" aria-hidden="true" />
        {offline
          ? `Offline. ${pending} score${pending === 1 ? "" : "r"} gemt på telefonen.`
          : pending > 0
            ? `Sender ${pending} score${pending === 1 ? "" : "r"}…`
            : "Alt er gemt"}
      </div>

      {error ? <div className="notice">Kunne ikke gemme: {error}</div> : null}

      <div className="hole-nav">
        <button
          type="button"
          className="hole-nav__btn"
          onClick={() => setHole(round.holes[index - 1].hole)}
          disabled={index <= 0}
          aria-label="Forrige hul"
        >
          ‹
        </button>
        <div className="hole-nav__title">
          <div className="hole-nav__hole">Hul {spec.hole}</div>
          <div className="hole-nav__spec">
            Par {spec.par} · Nøgle {spec.strokeIndex}
          </div>
        </div>
        <button
          type="button"
          className="hole-nav__btn"
          onClick={() => setHole(round.holes[index + 1].hole)}
          disabled={index >= round.holes.length - 1}
          aria-label="Næste hul"
        >
          ›
        </button>
      </div>

      {editable.map((player) => {
        const gross = scores[player.roundPlayerId]?.[hole] ?? null;
        const received = strokesOnHole(player.handicapStrokes, spec.strokeIndex, round.holes.length);
        const points = holePoints(gross, spec.par, received);
        const total = round.holes.reduce((n, h) => {
          const g = scores[player.roundPlayerId]?.[h.hole] ?? null;
          return n + holePoints(g, h.par, strokesOnHole(player.handicapStrokes, h.strokeIndex, round.holes.length));
        }, 0);

        return (
          <div key={player.roundPlayerId} className="entry-card">
            <div className="entry-card__head">
              <span className="entry-card__name">
                {player.name}
                {player.playerId === viewerId ? " (dig)" : ""}
              </span>
              <span className="entry-card__meta">
                {received > 0 ? `${received} slag på hullet · ` : ""}
                {total} point i alt
              </span>
            </div>

            <div className="score-buttons">
              {options.map((value) => {
                // The chosen button takes the colour of the points it pays, so the
                // keypad teaches the same scale the scorecard uses.
                const worth = holePoints(value, spec.par, received);
                return (
                  <button
                    key={value}
                    type="button"
                    className={`score-btn ${holeClass(worth)}`}
                    aria-pressed={gross === value}
                    onClick={() => setScore(player.roundPlayerId, gross === value ? null : value)}
                  >
                    {value}
                  </button>
                );
              })}
              <button
                type="button"
                className="score-btn score-btn--clear"
                onClick={() => setScore(player.roundPlayerId, null)}
              >
                Slet
              </button>
            </div>

            <div className="entry-card__result">
              {gross === null ? (
                <span style={{ color: "var(--text-faint)" }}>Ingen score endnu</span>
              ) : (
                <>
                  <span className={holeClass(points)}>{points}</span>
                  <span>
                    point på hullet
                    {points > LEVEL_PER_HOLE ? ", bedre end par" : points === LEVEL_PER_HOLE ? ", lige" : ""}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}

      <ScoreKey />

      <div className="live-actions">
        <Link href={`/live/${round.id}`} className="btn btn--dark">
          Se livescoren
        </Link>
      </div>
    </div>
  );
}
