"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BirdieListRow } from "@/lib/data";
import { formatPlace, tiedPlaces } from "@/lib/scoring";

/**
 * The birdie list, with each player's birdies laid out by course underneath.
 * The old site showed every detail at once; here the count is a button that
 * opens one player, and "vis alle" opens the lot, which is the same overview
 * without a wall of text on a phone.
 */

function placeClass(place: number): string {
  if (place === 1) return "place place--1";
  if (place <= 3) return `place place--${place}`;
  return "place";
}

type Detail = BirdieListRow["details"][number];

function byCourse(details: Detail[]): { course: string; holes: Detail[] }[] {
  const groups = new Map<string, Detail[]>();
  for (const detail of details) {
    const list = groups.get(detail.courseLabel) ?? [];
    list.push(detail);
    groups.set(detail.courseLabel, list);
  }
  return [...groups.entries()].map(([course, holes]) => ({
    course,
    holes: [...holes].sort((a, b) => (a.hole ?? 0) - (b.hole ?? 0)),
  }));
}

export function BirdieList({ rows, year }: { rows: BirdieListRow[]; year: number }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const tied = useMemo(() => tiedPlaces(rows.map((row) => row.place)), [rows]);
  const allOpen = open.size === rows.length && rows.length > 0;

  function toggle(slug: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <>
      <div className="list-tools">
        <button
          type="button"
          className="link-button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(rows.map((row) => row.playerSlug)))}
        >
          {allOpen ? "Skjul alle detaljer" : "Vis alle detaljer"}
        </button>
      </div>

      <div className="panel panel--table">
        <table className="table table--birdies">
          <thead>
            <tr>
              <th>#</th>
              <th>Deltager</th>
              <th className="is-points">Birdies</th>
              <th className="is-center">Nøglesum</th>
              <th className="is-center">Pointsum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = open.has(row.playerSlug);
              const detailId = `birdies-${row.playerSlug}`;
              const groups = byCourse(row.details);

              return [
                <tr key={row.playerSlug} className={row.place === 1 ? "is-leader" : undefined}>
                  <td>
                    <span className={placeClass(row.place)}>{formatPlace(row.place, tied)}</span>
                  </td>
                  <td className="cell-name">
                    <Link href={`/spiller/${row.playerSlug}`}>{row.playerName}</Link>
                    {row.eagles > 0 ? (
                      <span className="cell-note">
                        {" "}
                        inkl. {row.eagles} eagle{row.eagles > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </td>
                  <td className="cell-total">
                    <button
                      type="button"
                      className="count-button"
                      aria-expanded={isOpen}
                      aria-controls={detailId}
                      onClick={() => toggle(row.playerSlug)}
                      title={isOpen ? "Skjul hvor de blev lavet" : "Se hvor de blev lavet"}
                    >
                      {row.count}
                      <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden="true" focusable="false">
                        <path
                          d={isOpen ? "M1 5.5L5 1.5l4 4" : "M1 1.5l4 4 4-4"}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                  <td className="cell-score cell-muted">{row.keySum}</td>
                  <td className="cell-score cell-muted">{row.pointSum}</td>
                </tr>,

                <tr key={`${row.playerSlug}-detail`} id={detailId} hidden={!isOpen} className="detail-row">
                  <td colSpan={5}>
                    <div className="birdie-detail">
                      <p className="birdie-detail__lede">
                        {row.count} {row.count === 1 ? "birdie" : "birdies"} på {groups.length}{" "}
                        {groups.length === 1 ? "bane" : "baner"} i {year}.
                      </p>
                      {groups.map((group) => (
                        <div key={group.course} className="birdie-course">
                          <span className="birdie-course__name">{group.course}</span>
                          <span className="birdie-course__holes">
                            {group.holes.map((hole, index) => (
                              <span
                                key={`${hole.hole}-${index}`}
                                className={`birdie-hole birdie-hole--${hole.kind}`}
                                title={`Hul ${hole.hole}, par ${hole.par ?? "?"}, nøgle ${hole.strokeIndex ?? "?"}${
                                  hole.kind === "birdie" ? "" : ` · ${hole.kind}`
                                }`}
                              >
                                {hole.hole}
                              </span>
                            ))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>

      <p className="footnote">
        Tallene i cirklerne er hulnumre. Rød er en birdie, gul en eagle. Hold musen over et hul for
        par og nøgle.
      </p>
    </>
  );
}
