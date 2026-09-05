"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ScoreEntry } from "@/components/score-entry";
import type { CourseDetail, PlayerSummary } from "@/lib/data";
import type { LiveRound } from "@/lib/live/types";
import { meters } from "@/lib/format";
import { canComputeStrokes, courseHandicap } from "@/lib/scoring";
import { recordDemoScore, saveDemoRound } from "@/lib/live/demo";

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

/**
 * Handicap in, strokes out. The strokes are computed the moment an index is
 * typed, and can still be overruled by hand, because the number on the day is
 * whatever the two players agree on.
 */
function HandicapFields({
  index,
  strokes,
  onIndex,
  onStrokes,
  course,
  label,
}: {
  index: number | null;
  strokes: number;
  onIndex: (next: number | null) => void;
  onStrokes: (next: number) => void;
  course: CourseDetail;
  label: string;
}) {
  const computable = canComputeStrokes(course);
  const suggested =
    computable && index !== null ? courseHandicap(index, course.slope, course.courseRating, course.par) : null;

  return (
    <div className="handicap-fields">
      {computable ? (
        <label className="handicap-fields__field">
          <span>Handicap</span>
          <input
            type="number"
            step="0.1"
            min={-10}
            max={54}
            inputMode="decimal"
            value={index ?? ""}
            aria-label={`Handicap for ${label}`}
            onChange={(event) => {
              const next = event.target.value === "" ? null : Number(event.target.value);
              onIndex(next);
              if (next !== null) onStrokes(courseHandicap(next, course.slope, course.courseRating, course.par));
            }}
          />
        </label>
      ) : null}

      <label className="handicap-fields__field">
        <span>Tildelte slag</span>
        <StrokeInput value={strokes} onChange={onStrokes} label={label} />
      </label>

      {suggested !== null ? (
        <p className="handicap-fields__note">
          {suggested === strokes
            ? `Regnet ud fra ${course.tee} tee: slope ${course.slope}, CR ${course.courseRating}, par ${course.par}.`
            : `Formlen giver ${suggested}. Du har rettet det til ${strokes}.`}
        </p>
      ) : null}
    </div>
  );
}

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
  const [marking, setMarking] = useState<string[]>([]);
  const [index, setIndex] = useState<Record<string, number | null>>({});
  const [strokes, setStrokes] = useState<Record<string, number>>({});

  const playerOf = (slug: string) => players.find((p) => p.slug === slug);
  const nameOf = (slug: string) => playerOf(slug)?.name ?? slug;

  /** Seed a player from the handicap they were last recorded off. */
  function seed(slug: string) {
    const known = playerOf(slug)?.handicapIndex ?? null;
    setIndex((current) => (slug in current ? current : { ...current, [slug]: known }));
    setStrokes((current) => {
      if (slug in current) return current;
      const computed =
        known !== null && canComputeStrokes(course)
          ? courseHandicap(known, course.slope, course.courseRating, course.par)
          : 18;
      return { ...current, [slug]: computed };
    });
  }

  function toggleMarking(slug: string) {
    setMarking((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
    seed(slug);
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
        handicap: index[slug] ?? null,
        handicapStrokes: strokes[slug] ?? 18,
        flight: 1,
        markerId: slug === me ? null : `player-${me}`,
        status: "playing",
        scores: {},
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, marking, index, strokes, course, venue, startsAt]);

  if (step === "playing" && me) {
    return (
      <>
        <ScoreEntry
          round={round}
          viewerId={`player-${me}`}
          isAdmin={false}
          onScore={recordDemoScore}
        />
        <p className="preview-note">
          Scorerne bliver gemt her på telefonen, så de også står på{" "}
          <Link href="/design/live">livescoren</Link>.
        </p>
      </>
    );
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
                  seed(player.slug);
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
            Slagene regnes ud fra dit handicap og banen, og fordeles efter nøgle med det sværeste
            hul først. Ret dem, hvis I er enige om noget andet.
          </p>
          <HandicapFields
            course={course}
            label={nameOf(me ?? "")}
            index={index[me ?? ""] ?? null}
            strokes={strokes[me ?? ""] ?? 18}
            onIndex={(next) => setIndex((current) => ({ ...current, [me ?? ""]: next }))}
            onStrokes={(next) => setStrokes((current) => ({ ...current, [me ?? ""]: next }))}
          />
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
              onClick={() => {
                if (marking.length === 0) saveDemoRound(round);
                setStep(marking.length > 0 ? "confirm" : "playing");
              }}
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
            Regnet ud fra det handicap de sidst spillede på. Spørg dem på første tee, for står det
            forkert, tæller runden forkert.
          </p>
          {marking.map((slug) => (
            <div key={slug} className="confirm-row">
              <span className="confirm-row__name">{nameOf(slug)}</span>
              <HandicapFields
                course={course}
                label={nameOf(slug)}
                index={index[slug] ?? null}
                strokes={strokes[slug] ?? 18}
                onIndex={(next) => setIndex((current) => ({ ...current, [slug]: next }))}
                onStrokes={(next) => setStrokes((current) => ({ ...current, [slug]: next }))}
              />
            </div>
          ))}
          <div className="setup-actions">
            <button type="button" className="btn btn--dark" onClick={() => setStep("marking")}>
              Tilbage
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                saveDemoRound(round);
                setStep("playing");
              }}
            >
              Start runden
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
