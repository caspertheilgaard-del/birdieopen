import Link from "next/link";
import { notFound } from "next/navigation";
import { SeasonNav } from "@/components/season-nav";
import { StandingsTable } from "@/components/standings-table";
import { getSeasons, getStandings } from "@/lib/data";

type Params = { year: string };
type Search = { visning?: string };

export async function generateStaticParams(): Promise<Params[]> {
  const seasons = await getSeasons();
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  return { title: `Stillingen ${year}` };
}

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { year } = await params;
  const { visning } = await searchParams;
  const season = Number(year);
  const [standings, seasons] = await Promise.all([getStandings(season), getSeasons()]);
  if (!standings) notFound();

  const hasFinal = standings.final !== null;
  const view = visning === "indledende" || !hasFinal ? "prelim" : "final";
  const table = view === "final" ? standings.final : standings.prelim;

  const note =
    view === "final"
      ? "Finalerunderne. Hver celle viser finalepoint med rundens stablefordscore i parentes."
      : `De indledende runder. Alle stablefordscores lægges sammen til sæsonens samlede stilling.`;

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Stillingen {season}</h1>
          <p className="page-note">{note}</p>
        </div>
        {hasFinal && standings.prelim ? (
          <div className="toggle" role="tablist" aria-label="Vælg visning">
            <Link
              href={`/stilling/${season}`}
              className="toggle__btn"
              role="tab"
              aria-selected={view === "final"}
            >
              Finalen
            </Link>
            <Link
              href={`/stilling/${season}?visning=indledende`}
              className="toggle__btn"
              role="tab"
              aria-selected={view === "prelim"}
            >
              Indledende runder
            </Link>
          </div>
        ) : null}
      </div>

      <SeasonNav seasons={seasons} current={season} base="/stilling" />

      {table ? <StandingsTable table={table} year={season} /> : <p className="page-note">Ingen resultater for {season}.</p>}

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
    </main>
  );
}
