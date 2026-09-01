import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Writes one self-contained HTML file per screen: stylesheet, fonts and logo all
 * inlined, so a file opens straight from the Finder with no server and no
 * network. Meant as a design reference to look at and pass on, not as the site.
 */

const BASE = process.env.EXPORT_BASE ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "design-html");

type Page = { file: string; url: string; title: string; note: string };

const PAGES: Page[] = [
  { file: "index.html", url: "/", title: "Forside", note: "Hero, top 5 i finalen, næste runde og mestrene." },
  { file: "stilling-finale.html", url: "/stilling/2026", title: "Stilling, finalen", note: "Finalerunderne med overførte point og stablefordscore i parentes." },
  { file: "stilling-indledende.html", url: "/stilling/2026?visning=indledende", title: "Stilling, indledende runder", note: "De syv indledende runder. Gråtonede tal er tildelt gennemsnitsscore ved afbud." },
  { file: "turneringsplan.html", url: "/turneringsplan/2026", title: "Turneringsplan", note: "Alle runder med bane, tid og rundevinder." },
  { file: "birdieliste.html", url: "/birdielisten/2026", title: "Birdielisten", note: "Antal, nøglesum og pointsum." },
  { file: "deltagere.html", url: "/deltagere", title: "Deltagere", note: "Aktive deltagere med badges, og tidligere deltagere som chips." },
  { file: "spiller.html", url: "/spiller/jon-fogh", title: "Spillerprofil", note: "Karrieren sæson for sæson. Ny side, som designet ikke dækkede." },
  { file: "scorekort.html", url: "/scorekort/2026/148/jon-fogh", title: "Scorekort", note: "Hul for hul med farvede scores. Ny side, som designet ikke dækkede." },
  { file: "regler.html", url: "/regler", title: "Regler", note: "Turneringsregler, baner og pris." },
];

/** Internal links are pointed at the nearest exported file. */
const LINK_MAP: [RegExp, string][] = [
  [/^\/$/, "index.html"],
  [/^\/stilling\/\d+\?visning=indledende$/, "stilling-indledende.html"],
  [/^\/stilling(\/\d+)?(\?.*)?$/, "stilling-finale.html"],
  [/^\/turneringsplan\/\d+\/kalender\.ics$/, "#"],
  [/^\/turneringsplan(\/\d+)?$/, "turneringsplan.html"],
  [/^\/birdielisten(\/\d+)?$/, "birdieliste.html"],
  [/^\/deltagere$/, "deltagere.html"],
  [/^\/spiller\/.+$/, "spiller.html"],
  [/^\/scorekort\/.+$/, "scorekort.html"],
  [/^\/regler$/, "regler.html"],
  [/^\/live.*$/, "#"],
  [/^\/sponsorer$/, "#"],
  [/^\/log-ind.*$/, "#"],
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchDataUri(url: string, mime: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return `data:${mime};base64,${base64}`;
}

const cache = new Map<string, string>();
async function cachedDataUri(url: string, mime: string): Promise<string> {
  const hit = cache.get(url);
  if (hit) return hit;
  const uri = await fetchDataUri(url, mime);
  cache.set(url, uri);
  return uri;
}

/**
 * Pulls the font files out of the stylesheet and embeds them. Next writes the
 * paths relative to the stylesheet, so they are resolved against its own URL.
 */
async function inlineFonts(css: string, cssUrl: string): Promise<string> {
  const urls = [...css.matchAll(/url\(([^)"']+\.(woff2?|ttf))\)/g)];
  let out = css;
  for (const [, href, ext] of urls) {
    if (href.startsWith("data:")) continue;
    const mime = ext === "ttf" ? "font/ttf" : `font/${ext}`;
    const absolute = new URL(href, cssUrl).toString();
    const uri = await cachedDataUri(absolute, mime);
    out = out.split(`url(${href})`).join(`url(${uri})`);
  }
  return out;
}

function mapLink(href: string): string {
  for (const [pattern, target] of LINK_MAP) {
    if (pattern.test(href)) return target;
  }
  return "#";
}

async function buildPage(page: Page, logo: string): Promise<string> {
  let html = await fetchText(`${BASE}${page.url}`);

  // Inline every stylesheet the page pulls in.
  const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g)];
  for (const [tag, href] of sheets) {
    const cssUrl = href.startsWith("http") ? href : `${BASE}${href}`;
    const css = await inlineFonts(await fetchText(cssUrl), cssUrl);
    html = html.replace(tag, `<style>\n${css}\n</style>`);
  }

  // The pages work without JavaScript, so the Next.js runtime can go.
  html = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<link[^>]+rel="preload"[^>]*>/g, "")
    .replace(/<link[^>]+rel="prefetch"[^>]*>/g, "");

  // The logo is the only image on these screens.
  html = html.replace(/src="\/_next\/image\?url=%2Flogo\.png[^"]*"/g, `src="${logo}"`);
  html = html.replace(/src="\/logo\.png"/g, `src="${logo}"`);
  html = html.replace(/srcSet="[^"]*"|srcset="[^"]*"/g, "");

  // Point the navigation at the sibling files.
  html = html.replace(/href="(\/[^"]*)"/g, (_match, href: string) => `href="${mapLink(href)}"`);

  return html;
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const logo = await fetchDataUri(`${BASE}/logo.png`, "image/png");

  // The one link that is meant to leave the file: the old site still hosts the
  // 2012 rules, and the design points at them.
  const ALLOWED = ["https://www.birdieopen.dk/index.php/rules"];

  let leaks = 0;
  for (const page of PAGES) {
    const html = await buildPage(page, logo);
    await writeFile(path.join(OUT, page.file), html, "utf8");

    const external = [
      ...html.matchAll(/(?:src|href)="((?:https?:\/\/|\/)[^"#][^"]*)"/g),
      ...html.matchAll(/url\(((?:\.\.\/|\/)[^)]*)\)/g),
    ]
      .map((m) => m[1])
      .filter((href) => !ALLOWED.includes(href));

    const size = `${Math.round(Buffer.byteLength(html) / 1024)} KB`;
    console.log(`  ${page.file.padEnd(28)} ${size.padStart(7)}  ${page.title}`);
    if (external.length > 0) {
      leaks += external.length;
      console.error(`     henter stadig udefra: ${[...new Set(external)].slice(0, 4).join(", ")}`);
    }
  }

  const readme = [
    "# Birdie Open, designet som HTML",
    "",
    "En fil pr. skærm. Åbn dem ved at dobbeltklikke. Alt er indlejret i filen:",
    "stylesheet, skrifter og logo, så de virker uden server og uden internet.",
    "",
    "Data er de rigtige tal fra sæson 2026.",
    "",
    ...PAGES.map((p) => `- \`${p.file}\` — ${p.title}. ${p.note}`),
    "",
    "## To ting at vide",
    "",
    "Menuen virker mellem filerne, men hvert skærmbillede findes kun i én udgave.",
    "Klikker man på en anden spiller end Jon Fogh, lander man på hans profil, og",
    "sæsonvælgeren fører altid til 2026. Det er filer til gennemsyn, ikke sitet.",
    "",
    "Live, login og sponsorer er ikke med. De sider skal have en database bag sig.",
    "",
    "Det eneste link, der peger ud af filerne, er reglerne anno 2012. De ligger",
    "stadig på det gamle site. Alt andet er indlejret.",
    "",
    "Selve sitet ligger i `~/birdieopen` og køres med `npm run dev`.",
  ].join("\n");

  await writeFile(path.join(OUT, "LÆSMIG.md"), `${readme}\n`, "utf8");

  if (leaks > 0) {
    console.error(`\n${leaks} referencer peger ud af filerne. De virker ikke offline.`);
    process.exit(1);
  }
  console.log(`\n${PAGES.length} filer i design-html/. Alt er indlejret.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
