"use client";

import { useState, useTransition } from "react";
import { setRoundStatus, updateRoundPlayer } from "@/lib/live/actions";
import type { LiveRound } from "@/lib/live/types";

const STATUS_ACTIONS: { value: "scheduled" | "live" | "final"; label: string; hint: string }[] = [
  { value: "scheduled", label: "Planlagt", hint: "Ingen kan taste" },
  { value: "live", label: "Åbn runden", hint: "Spillere og markører kan taste" },
  { value: "final", label: "Luk runden", hint: "Låser scores og opdaterer stillingen" },
];

export function RoundAdmin({ round }: { round: LiveRound }) {
  const [status, setStatus] = useState(round.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Noget gik galt");
      }
    });
  };

  return (
    <>
      <div className="card rules-card" style={{ marginBottom: 20 }}>
        <h2>Status</h2>
        <div className="live-actions" style={{ marginTop: 0 }}>
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action.value}
              type="button"
              className={`btn ${status === action.value ? "btn--primary" : "btn--dark"}`}
              disabled={pending || status === action.value}
              onClick={() =>
                run(async () => {
                  await setRoundStatus(round.id, action.value);
                  setStatus(action.value);
                })
              }
              title={action.hint}
            >
              {action.label}
            </button>
          ))}
        </div>
        <p className="footnote" style={{ marginBottom: 0 }}>
          {STATUS_ACTIONS.find((a) => a.value === status)?.hint}
        </p>
      </div>

      {error ? <div className="notice">{error}</div> : null}

      <h2 className="section-label">Deltagere</h2>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Deltager</th>
              <th className="is-center">Hcp.</th>
              <th className="is-center">Tildelte slag</th>
              <th className="is-center">Bold</th>
              <th className="is-center">Markør</th>
              <th className="is-center">Afbud</th>
            </tr>
          </thead>
          <tbody>
            {round.players.map((player) => (
              <PlayerRow key={player.roundPlayerId} player={player} round={round} onError={setError} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PlayerRow({
  player,
  round,
  onError,
}: {
  player: LiveRound["players"][number];
  round: LiveRound;
  onError: (message: string | null) => void;
}) {
  const [values, setValues] = useState({
    handicap: player.handicap,
    handicapStrokes: player.handicapStrokes,
    flight: player.flight,
    markerId: player.markerId,
    status: player.status,
  });
  const [, startTransition] = useTransition();

  const save = (patch: Parameters<typeof updateRoundPlayer>[1]) => {
    onError(null);
    startTransition(async () => {
      try {
        await updateRoundPlayer(player.roundPlayerId, patch);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Kunne ikke gemme");
      }
    });
  };

  const cell: React.CSSProperties = {
    font: "inherit",
    width: 74,
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid var(--border-card)",
    background: "var(--surface)",
    textAlign: "center",
  };

  return (
    <tr>
      <td className="cell-name">{player.name}</td>
      <td className="is-center" style={{ textAlign: "center" }}>
        <input
          type="number"
          step="0.1"
          style={cell}
          value={values.handicap ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, handicap: e.target.value === "" ? null : Number(e.target.value) }))}
          onBlur={() => save({ handicap: values.handicap })}
          aria-label={`Handicap for ${player.name}`}
        />
      </td>
      <td style={{ textAlign: "center" }}>
        <input
          type="number"
          min={0}
          max={54}
          style={cell}
          value={values.handicapStrokes}
          onChange={(e) => setValues((v) => ({ ...v, handicapStrokes: Number(e.target.value) }))}
          onBlur={() => save({ handicap_strokes: values.handicapStrokes })}
          aria-label={`Tildelte slag for ${player.name}`}
        />
      </td>
      <td style={{ textAlign: "center" }}>
        <input
          type="number"
          min={1}
          max={9}
          style={{ ...cell, width: 56 }}
          value={values.flight ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, flight: e.target.value === "" ? null : Number(e.target.value) }))}
          onBlur={() => save({ flight: values.flight })}
          aria-label={`Bold for ${player.name}`}
        />
      </td>
      <td style={{ textAlign: "center" }}>
        <select
          style={{ ...cell, width: 150 }}
          value={values.markerId ?? ""}
          onChange={(e) => {
            const markerId = e.target.value || null;
            setValues((v) => ({ ...v, markerId }));
            save({ marker_id: markerId });
          }}
          aria-label={`Markør for ${player.name}`}
        >
          <option value="">Ingen</option>
          {round.players
            .filter((other) => other.playerId !== player.playerId)
            .map((other) => (
              <option key={other.playerId} value={other.playerId}>
                {other.name}
              </option>
            ))}
        </select>
      </td>
      <td style={{ textAlign: "center" }}>
        <input
          type="checkbox"
          checked={values.status === "absent"}
          onChange={(e) => {
            const status = e.target.checked ? "absent" : "playing";
            setValues((v) => ({ ...v, status }));
            save({ status });
          }}
          aria-label={`Afbud for ${player.name}`}
          style={{ width: 20, height: 20 }}
        />
      </td>
    </tr>
  );
}
