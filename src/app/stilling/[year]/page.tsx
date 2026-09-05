import { notFound } from "next/navigation";
import { StandingsView } from "@/components/standings-view";
import { getSeasons, getStandings } from "@/lib/data";

type Params = { year: string };

export async function generateStaticParams(): Promise<Params[]> {
  const seasons = await getSeasons();
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  return { title: `Stillingen ${year}` };
}

export default async function StandingsPage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const season = Number(year);
  const [standings, seasons] = await Promise.all([getStandings(season), getSeasons()]);
  if (!standings) notFound();

  return (
    <main className="wrap">
      <StandingsView standings={standings} seasons={seasons} />
    </main>
  );
}
