import Link from "next/link";
import { notFound } from "next/navigation";
import { RoundSetup } from "@/components/round-setup";
import { getCourse, getPlayers } from "@/lib/data";
import { longDate, timeOfDay } from "@/lib/format";

export const metadata = { title: "Ny runde, forhåndsvisning" };

/** Lübker Sand/Sky off the white tee, typed in from the club's own scorecard. */
const COURSE_KEY = "Lübker Sand/Sky|Hvid";
const TEE_TIME = "2027-05-15T09:30:00+02:00";

export default async function NewRoundPage() {
  const [course, players] = await Promise.all([getCourse(COURSE_KEY), getPlayers()]);
  if (!course) notFound();

  const active = players.filter((player) => player.active);

  return (
    <main>
      <section className="live-head">
        <div className="live-head__inner">
          <span className="live-badge">
            <span className="live-badge__dot" aria-hidden="true" />
            Ny runde
          </span>
          <h1 className="live-head__title" style={{ fontSize: "clamp(26px,5vw,40px)" }}>
            {course.club ?? course.name}
          </h1>
          <p className="live-head__meta">
            {`${longDate(TEE_TIME)} ${timeOfDay(TEE_TIME)}`.trim()} · {course.name} · {course.tee} tee
          </p>
        </div>
      </section>

      <RoundSetup
        course={course}
        players={active}
        venue={course.club ?? course.name}
        startsAt={TEE_TIME}
      />

      <p className="preview-note">
        Forhåndsvisning. Huller, par, nøgle og længder er hentet fra {course.name}, {course.tee} tee.
        I den rigtige app åbner turneringsledelsen runden, og så står den klar her.{" "}
        <Link href="/design/live">Se livescoren</Link>.
      </p>
    </main>
  );
}
