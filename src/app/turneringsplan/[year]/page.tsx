import Link from "next/link";
import { notFound } from "next/navigation";
import { SeasonNav } from "@/components/season-nav";
import { getSchedule, getSeasons, type ScheduleRound } from "@/lib/data";
import { dayAndMonth, isSameDay, longDate, meters, timeOfDay } from "@/lib/format";

type Params = { year: string };

export async function generateStaticParams(): Promise<Params[]> {
  const seasons = await getSeasons();
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  return { title: `Turneringsplan ${year}` };
}

function RoundCard({ round, next }: { round: ScheduleRound; next: boolean }) {
  const date = dayAndMonth(round.startsAt);
  const today = isSameDay(round.startsAt, new Date());

  return (
    <div className={`round-card${next ? " is-next" : ""}`}>
      <div className="date-block">
        <div className="date-block__day">{date.day}</div>
        <div className="date-block__month">{date.month}</div>
      </div>
      <div className="round-card__body">
        <div className="round-card__venue">{round.venue}</div>
        <div className="round-card__meta">
          {[
            `${longDate(round.startsAt)} ${timeOfDay(round.startsAt)}`.trim(),
            round.courseName,
            round.par ? `Par ${round.par}` : null,
            meters(round.lengthMeters),
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {round.address ? <div className="round-card__address">{round.address}</div> : null}
      </div>
      {round.winner ? (
        <div className="chip">
          <span className="chip__label">Vinder</span>
          <span className="chip__value">
            {round.winner.name} · {round.winner.points} point
          </span>
        </div>
      ) : (
        <div className="chip chip--next">
          <span className="chip__label">{today ? "I dag" : "Endnu ikke spillet"}</span>
          <span className="chip__value">{timeOfDay(round.startsAt) || "Tid følger"}</span>
        </div>
      )}
    </div>
  );
}

export default async function SchedulePage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const season = Number(year);
  const [rounds, seasons] = await Promise.all([getSchedule(season), getSeasons()]);
  if (rounds.length === 0) notFound();

  const prelim = rounds.filter((r) => r.kind === "prelim");
  const finals = rounds.filter((r) => r.kind === "final");
  const nextRound = rounds.find((r) => r.winner === null);
  const finalVenue = finals[finals.length - 1]?.venue;

  return (
    <main className="wrap wrap--plan">
      <h1 className="page-title">TURNERINGSPLAN {season}</h1>
      <p className="page-note">
        {prelim.length} indledende runder · {finals.length} finalerunder ·{" "}
        <Link href={`/turneringsplan/${season}/kalender.ics`}>importér i din kalender (ics)</Link>
      </p>

      <SeasonNav seasons={seasons} current={season} base="/turneringsplan" />

      {prelim.length > 0 ? (
        <>
          <h2 className="section-label" style={{ marginTop: 12 }}>
            Indledende runder
          </h2>
          <div className="round-list">
            {prelim.map((round) => (
              <RoundCard key={round.roundId} round={round} next={round.roundId === nextRound?.roundId} />
            ))}
          </div>
        </>
      ) : null}

      {finals.length > 0 ? (
        <>
          <h2 className="section-label" style={{ marginTop: 30 }}>
            Finalerunder{finalVenue ? ` · ${finalVenue}-weekenden` : ""}
          </h2>
          <div className="round-list">
            {finals.map((round) => (
              <RoundCard key={round.roundId} round={round} next={round.roundId === nextRound?.roundId} />
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
