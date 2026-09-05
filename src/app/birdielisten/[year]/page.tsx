import { notFound } from "next/navigation";
import Link from "next/link";
import { SeasonNav } from "@/components/season-nav";
import { getBirdieList, getSeasons } from "@/lib/data";

type Params = { year: string };

export async function generateStaticParams(): Promise<Params[]> {
  const seasons = await getSeasons();
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  return { title: `Birdielisten ${year}` };
}

function placeClass(place: number): string {
  if (place === 1) return "place place--1";
  if (place <= 3) return `place place--${place}`;
  return "place";
}

export default async function BirdiePage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const season = Number(year);
  const [rows, seasons] = await Promise.all([getBirdieList(season), getSeasons()]);
  if (!seasons.some((s) => s.year === season)) notFound();

  return (
    <main className="wrap wrap--birdies">
      <h1 className="page-title">Birdielisten {season}</h1>
      <p className="page-note" style={{ maxWidth: 640, textWrap: "pretty" }}>
        Placering afgøres efter flest birdies. En eagle (og hole-in-one) tæller som 3 birdies. Ved
        ligestilling vinder birdies på de sværeste huller, altså laveste nøglesum, og dernæst flest point.
      </p>

      <SeasonNav seasons={seasons} current={season} base="/birdielisten" />

      {rows.length === 0 ? (
        <p className="page-note">Ingen birdies registreret i {season}.</p>
      ) : (
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
              {rows.map((row) => (
                <tr key={row.playerSlug} className={row.place === 1 ? "is-leader" : undefined}>
                  <td>
                    <span className={placeClass(row.place)}>{row.place}</span>
                  </td>
                  <td className="cell-name">
                    <Link href={`/spiller/${row.playerSlug}`}>{row.playerName}</Link>
                    {row.eagles > 0 ? (
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--yellow-text)" }}>
                        {" "}
                        inkl. {row.eagles} eagle{row.eagles > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </td>
                  <td className="cell-total">{row.count}</td>
                  <td className="cell-score" style={{ color: "var(--text-secondary)" }}>
                    {row.keySum}
                  </td>
                  <td className="cell-score" style={{ color: "var(--text-secondary)" }}>
                    {row.pointSum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
