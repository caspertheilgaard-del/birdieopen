import { execSync } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Builds the site as plain files for a temporary host such as Netlify Drop.
 *
 * The pages that need the database are left out: they are keyed on ids that
 * only exist once a project is connected. The live screens are still there as
 * /design/live and /design/kort, which run on sample data.
 */

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");

/**
 * Moved aside for the duration of the build. Middleware needs a server, and the
 * rest are keyed on database ids that do not exist without a project.
 */
const PARK = [
  path.join("src", "middleware.ts"),
  path.join("src", "app", "admin"),
  path.join("src", "app", "live", "[round]"),
];

/** Anything renamed inside src/app is still a route, so it has to leave. */
const PARK_DIR = path.join(ROOT, ".static-build-parked");

async function main(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });

  await rm(PARK_DIR, { recursive: true, force: true });
  const parked: { from: string; to: string }[] = [];

  for (const relative of PARK) {
    const from = path.join(ROOT, relative);
    const to = path.join(PARK_DIR, relative);
    try {
      await mkdir(path.dirname(to), { recursive: true });
      await rename(from, to);
      parked.push({ from, to });
    } catch {
      // not there, nothing to move
    }
  }

  try {
    execSync("next build", {
      stdio: "inherit",
      env: { ...process.env, STATIC_EXPORT: "1" },
    });
  } finally {
    for (const { from, to } of parked.reverse()) await rename(to, from);
    await rm(PARK_DIR, { recursive: true, force: true });
  }

  // Netlify serves these as-is; the headers keep the HTML fresh while the
  // fingerprinted assets can be cached hard.
  await mkdir(OUT, { recursive: true });
  await writeFile(
    path.join(OUT, "_headers"),
    [
      "/*",
      "  Cache-Control: public, max-age=0, must-revalidate",
      "",
      "/_next/static/*",
      "  Cache-Control: public, max-age=31536000, immutable",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\nStatisk site klar i ${OUT}`);
  console.log("Træk mappen ind på app.netlify.com/drop, så er den online.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
