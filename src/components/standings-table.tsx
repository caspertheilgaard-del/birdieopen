import Link from "next/link";
import type { StandingsTable as Table } from "@/lib/data";
import { shortDate, timeOfDay } from "@/lib/format";
import { LEVEL_PER_ROUND, roundClass, seasonVsHandicap } from "@/lib/scoring";

function placeClass(place: number): string {
  if (place === 1) return "place place--1";
  if (place <= 3) return `place place--${place}`;
  return "place";
}

export function StandingsTable({ table, year }: { table: Table; year: number }) {
  const isFinal = table.kind === "final";

  return (
    <div className="panel panel--table">
      <table className="table table--standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Deltager</th>
            {isFinal ? <th className="is-center">Før finalen</th> : null}
            {table.columns.map((column) => (
              <th key={column.roundId} className="is-round">
                <div className="table__round-name">{column.venue}</div>
                <div className="table__round-date">
                  {`${shortDate(column.startsAt)} ${timeOfDay(column.startsAt)}`.trim()}
                </div>
              </th>
            ))}
            <th className="is-points">Point</th>
            {isFinal ? null : <th className="is-center">Mod hcp</th>}
            <th className="is-center">Til top</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.playerSlug} className={row.place === 1 ? "is-leader" : undefined}>
              <td>
                <span className={placeClass(row.place)}>{row.place}</span>
              </td>
              <td className="cell-name">
                <Link href={`/spiller/${row.playerSlug}`}>{row.playerName}</Link>
              </td>
              {isFinal ? <td className="cell-score is-carry">{row.carryover ?? "–"}</td> : null}
              {row.cells.map((cell, index) => {
                const column = table.columns[index];
                const empty = cell.value === null && cell.stableford === null;
                const classes = ["cell-score"];
                if (cell.average) classes.push("is-average");
                if (empty) classes.push("is-empty");
                // Preliminary rounds are stableford, so each one is read against
                // the 36 points that playing to your handicap pays.
                if (!isFinal && !empty) classes.push(roundClass(cell.value));

                return (
                  <td key={column.roundId} className={classes.join(" ")}>
                    {empty ? (
                      "–"
                    ) : isFinal ? (
                      <>
                        {cell.value ?? "–"}
                        {cell.stableford !== null ? (
                          <span style={{ color: "var(--text-faint)" }}> ({cell.stableford} point)</span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {cell.value}
                        {cell.scorecard ? (
                          <Link
                            className="scorecard-link"
                            href={`/scorekort/${year}/${column.roundId}/${row.playerSlug}`}
                            title={`Se scorekort for ${row.playerName}`}
                            aria-label={`Se scorekort for ${row.playerName}, ${column.venue}`}
                          >
                            <svg width="12" height="13" viewBox="0 0 12 13" aria-hidden="true" focusable="false">
                              <rect x="0.5" y="0.5" width="11" height="12" rx="1.5" fill="none" stroke="currentColor" />
                              <path d="M0.5 4.5h11M4.5 4.5v8" stroke="currentColor" />
                            </svg>
                          </Link>
                        ) : null}
                      </>
                    )}
                  </td>
                );
              })}
              <td className="cell-total">{row.total}</td>
              {isFinal ? null : <VsHandicap row={row} />}
              <td className="cell-behind">{row.behind === null ? "-" : row.behind}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How far a player is above or below 36 points for every round counted. */
function VsHandicap({ row }: { row: Table["rows"][number] }) {
  const counted = row.cells.filter((cell) => cell.value !== null).length;
  if (counted === 0) return <td className="cell-vs">–</td>;

  const diff = seasonVsHandicap(row.total, counted);
  return (
    <td className={`cell-vs${diff > 0 ? " is-ahead" : ""}`} title={`${counted} runder mod ${LEVEL_PER_ROUND * counted} point`}>
      {diff > 0 ? `+${diff}` : diff}
    </td>
  );
}
