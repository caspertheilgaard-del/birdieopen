import Link from "next/link";
import type { SeasonSummary } from "@/lib/data";

export function SeasonNav({
  seasons,
  current,
  base,
}: {
  seasons: SeasonSummary[];
  current: number;
  base: string;
}) {
  return (
    <nav className="season-nav" aria-label="Vælg sæson">
      {seasons.map((season) => (
        <Link
          key={season.year}
          href={`${base}/${season.year}`}
          className="season-nav__link"
          aria-current={season.year === current ? "page" : undefined}
        >
          {season.year}
        </Link>
      ))}
    </nav>
  );
}
