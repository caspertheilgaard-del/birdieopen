"use client";

import { useEffect, useState } from "react";
import { SeasonNav } from "@/components/season-nav";
import { StandingsTable } from "@/components/standings-table";
import type { SeasonStandings, SeasonSummary } from "@/lib/data";

/**
 * The finale and preliminary tables both ship with the page and the toggle
 * swaps between them in the browser. That keeps the page static, so the whole
 * site can be exported and hosted as plain files.
 */
export function StandingsView({
  standings,
  seasons,
}: {
  standings: SeasonStandings;
  seasons: SeasonSummary[];
}) {
  const hasFinal = standings.final !== null;
  const hasPrelim = standings.prelim !== null;
  const [view, setView] = useState<"final" | "prelim">(hasFinal ? "final" : "prelim");

  // Older links carry ?visning=indledende, so they still land in the right place.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("visning");
    if (wanted === "indledende" && hasPrelim) setView("prelim");
  }, [hasPrelim]);

  function choose(next: "final" | "prelim") {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "prelim") url.searchParams.set("visning", "indledende");
    else url.searchParams.delete("visning");
    window.history.replaceState(null, "", url);
  }

  const table = view === "final" ? standings.final : standings.prelim;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Stillingen {standings.year}</h1>
          <p className="page-note">
            {view === "final"
              ? "Finalerunderne. Hver celle viser finalepoint med rundens stablefordscore i parentes."
              : "De indledende runder. Alle stablefordscores lægges sammen til sæsonens samlede stilling."}
          </p>
        </div>
        {hasFinal && hasPrelim ? (
          <div className="toggle" role="tablist" aria-label="Vælg visning">
            <button
              type="button"
              className="toggle__btn"
              role="tab"
              aria-selected={view === "final"}
              onClick={() => choose("final")}
            >
              Finalen
            </button>
            <button
              type="button"
              className="toggle__btn"
              role="tab"
              aria-selected={view === "prelim"}
              onClick={() => choose("prelim")}
            >
              Indledende runder
            </button>
          </div>
        ) : null}
      </div>

      <SeasonNav seasons={seasons} current={standings.year} base="/stilling" />

      {table ? (
        <StandingsTable table={table} year={standings.year} />
      ) : (
        <p className="page-note">Ingen resultater for {standings.year}.</p>
      )}

      {view === "prelim" ? (
        <p className="footnote">
          36 point er at spille til sit handicap. Runder over står rødt, runder fra 41 og op er
          fremhævet, og runder under træder tilbage i gråt. Mod hcp er, hvor mange point man samlet
          ligger over eller under 36 for hver runde, der tæller med.
        </p>
      ) : null}
      <p className="footnote">
        Gråtonede scores: deltageren spillede ikke runden og fik tildelt rundens gennemsnitsscore
        (jf. reglernes pkt. 12). I finaletabellen vises finalepoint med stablefordscoren i parentes.
      </p>
    </>
  );
}
