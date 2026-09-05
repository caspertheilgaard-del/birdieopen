import { notFound } from "next/navigation";
import { BirdieList } from "@/components/birdie-list";
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
        <BirdieList rows={rows} year={season} />
      )}
    </main>
  );
}
