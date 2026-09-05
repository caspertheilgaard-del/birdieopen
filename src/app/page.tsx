import Link from "next/link";
import { getHome } from "@/lib/data";
import { dayAndMonth, isSameDay, longDate, meters, timeOfDay } from "@/lib/format";
import { formatPlace, tiedPlaces } from "@/lib/scoring";

export default async function HomePage() {
  const home = await getHome();
  const { season, top, nextRound, title, champion, birdieChampion, stats } = home;
  const leader = top[0];
  const tied = tiedPlaces(top.map((row) => row.place));
  const runnerUp = top[1];
  const today = new Date();
  const nextIsToday = isSameDay(nextRound?.startsAt ?? null, today);
  const date = dayAndMonth(nextRound?.startsAt ?? null);

  // Level at the top with nothing recorded about how it was settled: the front
  // page says the title is open rather than crowning one of them at random.
  const atTop = top.filter((row) => row.place === 1);
  const undecided = !nextRound && !title && atTop.length > 1;

  const badge = nextRound
    ? nextIsToday
      ? `${nextRound.kind === "final" ? "Finaledag" : "Spilledag"} · ${nextRound.kind === "final" ? "Finalerunde" : "Runde"} i dag ${timeOfDay(nextRound.startsAt)}`
      : `Næste runde · ${longDate(nextRound.startsAt)}`
    : undecided
      ? `Omspil om titlen · ${season.year}`
      : title
        ? `Afgjort på sidste hul · ${season.year}`
        : `Sæsonen er afgjort · ${season.year}`;

  const headline = nextRound?.venue
    ? nextRound.kind === "final"
      ? `Alt afgøres på ${nextRound.venue}.`
      : `Næste stop: ${nextRound.venue}.`
    : undecided
      ? "Det skal afgøres på ét hul."
      : title
        ? `${title.winnerName} vandt Birdie Open ${season.year}.`
        : leader
          ? `${leader.playerName} vandt Birdie Open ${season.year}.`
          : `Birdie Open ${season.year}.`;

  const lede = undecided
    ? `${atTop.map((row) => row.playerName).join(" og ")} sluttede Birdie Open ${season.year} på ${atTop[0].points} point. Efter reglernes pkt. 10 spilles der omspil på ét hul om førstepladsen.`
    : title
      ? `${title.winnerName} og ${title.tiedWith.join(" og ")} sluttede finalen lige på ${top[0]?.points} point, og sejren blev afgjort på sidste hul.`
      : leader && runnerUp
      ? `${leader.playerName} ${nextRound ? "fører" : "vandt"} Birdie Open ${season.year} med ${leader.points} point, ${runnerUp.points === leader.points ? "lige med" : `${leader.points - runnerUp.points} foran`} ${runnerUp.playerName}${nextRound ? "" : " efter sæsonens sidste runde"}.`
      : "Invitation-only golfturnering siden 2012.";

  return (
    <main>
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <span className="live-badge">
              <span className="live-badge__dot" aria-hidden="true" />
              {badge}
            </span>
            <h1 className="hero__title">{headline}</h1>
            <p className="hero__lede">{lede}</p>
            <div className="hero__actions">
              <Link href={`/stilling/${season.year}`} className="btn btn--primary">
                Se stillingen
              </Link>
              <Link href={`/turneringsplan/${season.year}`} className="btn btn--ghost">
                Turneringsplan
              </Link>
            </div>
          </div>

          <div className="hero__card">
            <div className="hero__card-head">
              <span className="hero__card-title">
                Stillingen · {home.finalRoundsTotal > 0 ? "finalen" : "sæsonen"}
              </span>
              <span className="hero__card-sub">
                {home.finalRoundsTotal > 0
                  ? `efter ${home.finalRoundsPlayed} af ${home.finalRoundsTotal} runder`
                  : `${stats.rounds} runder`}
              </span>
            </div>
            <div>
              {top.map((row) => (
                <div key={row.playerSlug} className={`hero__row${row.place === 1 ? " is-leader" : ""}`}>
                  <span
                    className="hero__row-place"
                    style={
                      row.place === 1
                        ? { background: "var(--yellow)", color: "var(--green)" }
                        : row.place <= 3
                          ? { background: "var(--green)", color: "var(--cream)" }
                          : undefined
                    }
                  >
                    {formatPlace(row.place, tied)}
                  </span>
                  <span className="hero__row-name">{row.playerName}</span>
                  <span className="hero__row-behind">{row.behind > 0 ? `+${row.behind}` : ""}</span>
                  <span className="hero__row-points">{row.points}</span>
                </div>
              ))}
            </div>
            <Link href={`/stilling/${season.year}`} className="hero__card-link">
              Se hele stillingen →
            </Link>
          </div>
        </div>

        <div className="stats">
          <div className="stats__inner">
            <div>
              <span className="stats__value">{stats.seasonNumber}.</span>{" "}
              <span className="stats__label">sæson siden 2012</span>
            </div>
            <div>
              <span className="stats__value">{stats.activePlayers}</span>{" "}
              <span className="stats__label">aktive deltagere</span>
            </div>
            <div>
              <span className="stats__value">{stats.rounds}</span>{" "}
              <span className="stats__label">runder i {season.year}</span>
            </div>
            <div>
              <span className="stats__value">{stats.birdies}</span>{" "}
              <span className="stats__label">birdies i {season.year}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-cards">
        {nextRound ? (
          <div className="card next-round">
            <div className="date-block">
              <div className="date-block__day">{date.day}</div>
              <div className="date-block__month">{date.month}</div>
            </div>
            <div className="next-round__body">
              <div className="eyebrow next-round__eyebrow">
                {nextIsToday ? "I dag" : "Næste runde"} ·{" "}
                {nextRound.kind === "final" ? "Finalerunde" : "Indledende runde"}
              </div>
              <div className="next-round__venue">
                {nextRound.venue}
                {nextRound.courseName ? ` · ${nextRound.courseName}` : ""}
              </div>
              <div className="next-round__meta">
                {[
                  `${longDate(nextRound.startsAt)} ${timeOfDay(nextRound.startsAt)}`.trim(),
                  nextRound.par ? `Par ${nextRound.par}` : null,
                  meters(nextRound.lengthMeters),
                  nextRound.address,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <Link href={`/turneringsplan/${season.year}`} className="btn btn--dark">
              Hele planen
            </Link>
          </div>
        ) : null}

        {champion ? (
          <div className="card champion-card">
            <div className="eyebrow">
              {champion.year === season.year ? "Mester" : "Forsvarende mester"} {champion.year}
            </div>
            <div className="champion-card__name">{champion.name}</div>
            <div className="champion-card__note">
              {title && title.winnerSlug === champion.slug
                ? title.note
                : `Vandt Birdie Open ${champion.year}.`}
            </div>
          </div>
        ) : null}

        {birdieChampion ? (
          <div className="card champion-card">
            <div className="eyebrow">
              {birdieChampion.year === season.year ? "Birdiemester" : "Forsvarende birdiemester"}{" "}
              {birdieChampion.year}
            </div>
            <div className="champion-card__name">{birdieChampion.name}</div>
            <div className="champion-card__note">Flest birdies i {birdieChampion.year}.</div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
