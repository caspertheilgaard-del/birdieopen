"use client";

import { useMemo, useState } from "react";
import { ScoreEntry } from "@/components/score-entry";
import type { CourseDetail, PlayerSummary } from "@/lib/data";
import type { LiveRound } from "@/lib/live/types";
import { meters } from "@/lib/format";

/**
 * Setting up a round before the first tee shot: who you are, how many strokes
 * you get, and who you are marking for. The holes come from the course and the
 * tee, so nobody types eighteen pars into a phone in a car park.
 */

type Step = "player" | "strokes" | "marking" | "confirm" | "playing";

const STEPS: { id: Step; label: string }[] = [
  { id: "player", label: "Dig" },
  { id: "strokes", label: "Slag" },
  { id: "marking", label: "Markør" },
  { id: "confirm", label: "Bekræft" },
];

function StrokeInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="stroke-input">
      <button
        type="button"
        className="stroke-input__step"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`Et slag mindre til ${label}`}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        max={54}
        inputMode="numeric"
        value={value}
        aria-label={`Tildelte slag til ${label}`}
        onChange={(event) => onChange(Math.min(54, Math.max(0, Number(event.target.value) || 0)))}
      />
      <button
        type="button"
        className="stroke-input__step"
        onClick={() => onChange(Math.min(54, value + 1))}
        aria-label={`Et slag mere til ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function RoundSetup({
  course,
  players,
  venue,
  startsAt,
}: {
  course: CourseDetail;
  players: PlayerSummary[];
  venue: string;
  startsAt: string;
}) {
  const [step, setStep] = useState<Step>("player");
  const [me, setMe] = useState<string | null>(null);
  const [myStrokes, setMyStrokes] = useState(18);
  const [marking, setMarking] = useState<string[]>([]);
  const [strokes, setStrokes] = useState<Record<string, number>>({});

  const nameOf = (slug: string) => players.find((p) => p.slug === slug)?.name ?? slug;

  function toggleMarking(slug: string) {
    setMarking((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
    setStrokes((current) => (slug in current ? current : { ...current, [slug]: 18 }));
  }

  // The round the score entry works on, built from the choices above.
  const round: LiveRound = useMemo(() => {
    const everyone = me ? [me, ...marking] : marking;
    return {
      id: "eksempel",
      year: new Date(startsAt).getFullYear(),
      kind: "prelim",
      venue,
      courseName: `${course.name} · tee ${course.tee}`,
      startsAt,
      status: "live",
      holes: course.holes,
      players: everyone.map((slug) => ({
        roundPlayerId: `rp-${slug}`,
        playerId: `player-${slug}`,
        name: nameOf(slug),
        slug,
        handicap: null,
        handicapStrokes: slug === me ? myStrokes : (strokes[slug] ?? 18),
        flight: 1,
        markerId: slug === me ? null : `player-${me}`,
        status: "playing",
        scores: {},
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, marking, myStrokes, strokes, course, venue, startsAt]);

  if (step === "playing" && me) {
    return <ScoreEntry round={round} viewerId={`player-${me}`} isAdmin={false} />;
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="entry">
      <ol className="steps" aria-label="Trin">
        {STEPS.map((s, index) => (
          <li
            key={s.id}
            className={index === stepIndex ? "is-current" : index < stepIndex ? "is-done" : undefined}
          >
            <span className="steps__number">{index + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="setup-card">
        <div className="setup-card__course">
          <span className="eyebrow">Runden</span>
          <div className="setup-card__venue">{venue}</div>
          <div className="setup-card__meta">
            {course.name} · {course.tee} tee · par {course.par} · {meters(course.lengthMeters)}
            {course.courseRating ? ` · CR ${course.courseRating} / slope ${course.slope}` : ""}
          </div>
          <div className="setup-card__meta">
            {course.holes.length} huller hentet med par, nøgle
            {course.holes.some((hole) => hole.lengthMeters) ? " og længde" : ""}.
          </div>
        </div>
      </div>

      {step === "player" ? (
        <section className="setup-step">
          <h2 className="setup-step__title">Hvem er du?</h2>
          <div className="pick-list">
            {players.map((player) => (
              <button
                key={player.slug}
                type="button"
                className="pick"
                aria-pressed={me === player.slug}
                onClick={() => {
                  setMe(player.slug);
                  setMarking((current) => current.filter((s) => s !== player.slug));
                  setStep("strokes");
                }}
              >
                {player.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "strokes" ? (
        <section className="setup-step">
          <h2 className="setup-step__title">Hvor mange slag får du?</h2>
          <p className="setup-step__note">
            Tildelte slag på {course.name} fra {course.tee} tee. De fordeles efter nøgle, sværeste
            hul først.
          </p>
          <StrokeInput value={myStrokes} onChange={setMyStrokes} label={nameOf(me ?? "")} />
          <div className="setup-actions">
            <button type="button" className="btn btn--dark" onClick={() => setStep("player")}>
              Tilbage
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setStep("marking")}>
              Videre
            </button>
          </div>
        </section>
      ) : null}

      {step === "marking" ? (
        <section className="setup-step">
          <h2 className="setup-step__title">Hvem er du markør for?</h2>
          <p className="setup-step__note">Vælg dem du går ud med. Du kan taste deres scores.</p>
          <div className="pick-list">
            {players
              .filter((player) => player.slug !== me)
              .map((player) => (
                <button
                  key={player.slug}
                  type="button"
                  className="pick"
                  aria-pressed={marking.includes(player.slug)}
                  onClick={() => toggleMarking(player.slug)}
                >
                  {player.name}
                </button>
              ))}
          </div>
          <div className="setup-actions">
            <button type="button" className="btn btn--dark" onClick={() => setStep("strokes")}>
              Tilbage
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setStep(marking.length > 0 ? "confirm" : "playing")}
            >
              {marking.length > 0 ? "Videre" : "Spring over"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "confirm" ? (
        <section className="setup-step">
          <h2 className="setup-step__title">Bekræft deres slag</h2>
          <p className="setup-step__note">
            Spørg dem på første tee. Står det forkert, tæller runden forkert.
          </p>
          {marking.map((slug) => (
            <div key={slug} className="confirm-row">
              <span className="confirm-row__name">{nameOf(slug)}</span>
              <StrokeInput
                value={strokes[slug] ?? 18}
                onChange={(next) => setStrokes((current) => ({ ...current, [slug]: next }))}
                label={nameOf(slug)}
              />
            </div>
          ))}
          <div className="setup-actions">
            <button type="button" className="btn btn--dark" onClick={() => setStep("marking")}>
              Tilbage
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setStep("playing")}>
              Start runden
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
