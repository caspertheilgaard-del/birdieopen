import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Writes one self-contained HTML file per screen: stylesheet, fonts and logo all
 * inlined, so a file opens straight from the Finder with no server and no
 * network. Meant as a design reference to look at and pass on, not as the site.
 */

const BASE = process.env.EXPORT_BASE ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "design-html");

type Page = { id: string; url: string; title: string; note: string };

/** Every file carries the project name, so nothing collides with a file the
    reader already has in their downloads folder. */
const fileFor = (id: string): string => `birdie-open-${id}.html`;

const PAGES: Page[] = [
  { id: "forside", url: "/", title: "Forside", note: "Hero, top 5 i finalen, næste runde og mestrene." },
  { id: "stilling-finale", url: "/stilling/2026", title: "Stilling, finalen", note: "Finalerunderne med overførte point og stablefordscore i parentes." },
  { id: "stilling-indledende", url: "/stilling/2026?visning=indledende", title: "Stilling, indledende runder", note: "De syv indledende runder. Gråtonede tal er tildelt gennemsnitsscore ved afbud." },
  { id: "turneringsplan", url: "/turneringsplan/2026", title: "Turneringsplan", note: "Alle runder med bane, tid og rundevinder." },
  { id: "birdieliste", url: "/birdielisten/2026", title: "Birdielisten", note: "Antal, nøglesum og pointsum." },
  { id: "deltagere", url: "/deltagere", title: "Deltagere", note: "Aktive deltagere med badges, og tidligere deltagere som chips." },
  { id: "spiller", url: "/spiller/jon-fogh", title: "Spillerprofil", note: "Karrieren sæson for sæson. Ny side, som designet ikke dækkede." },
  { id: "scorekort", url: "/scorekort/2026/148/jon-fogh", title: "Scorekort", note: "Hul for hul med farvede scores. Ny side, som designet ikke dækkede." },
  { id: "regler", url: "/regler", title: "Regler", note: "Turneringsregler, baner og pris." },
];

/** Internal links are pointed at the nearest exported file. */
const LINK_MAP: [RegExp, string][] = [
  [/^\/$/, fileFor("forside")],
  [/^\/stilling\/\d+\?visning=indledende$/, fileFor("stilling-indledende")],
  [/^\/stilling(\/\d+)?(\?.*)?$/, fileFor("stilling-finale")],
  [/^\/turneringsplan\/\d+\/kalender\.ics$/, "#"],
  [/^\/turneringsplan(\/\d+)?$/, fileFor("turneringsplan")],
  [/^\/birdielisten(\/\d+)?$/, fileFor("birdieliste")],
  [/^\/deltagere$/, fileFor("deltagere")],
  [/^\/spiller\/.+$/, fileFor("spiller")],
  [/^\/scorekort\/.+$/, fileFor("scorekort")],
  [/^\/regler$/, fileFor("regler")],
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

  // Anything with no counterpart in the export stops being a link, so nobody
  // clicks a dead end. Live, login, sponsors and the calendar all need a server.
  html = html.replace(/ href="#"/g, ' data-unavailable="true"');
  html = html.replace(
    "</head>",
    `<style>
  [data-unavailable] { cursor: default; opacity: 0.55; }
  a[data-unavailable]:hover { text-decoration: none; }
</style></head>`,
  );

  return html;
}

/**
 * Everything in one file, the way the original prototype worked: the nav swaps
 * which screen is shown instead of loading a page. Easier to pass on than nine
 * separate downloads.
 */
async function buildSingleFile(logo: string): Promise<string> {
  const shell = await buildPage(PAGES[0], logo);

  // Every style block, not just the first: the stylesheet and the small
  // preview-only rules are separate blocks.
  const style = [...shell.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]).join("\n");

  /*
    The font variables are declared on a class that Next puts on <html>, and this
    file has no <html> of its own. Without them every font-family resolves to an
    invalid var() chain and the page silently falls back to Times, so they are
    lifted onto :root.
  */
  const fontVars = [...style.matchAll(/(--font-[a-z0-9-]+)\s*:\s*([^;}]+)/gi)]
    .filter(([, name]) => name !== "--font-display" && name !== "--font-body")
    .map(([, name, value]) => `${name}: ${value.trim()};`);
  const fontRoot = fontVars.length > 0 ? `<style>:root { ${[...new Set(fontVars)].join(" ")} }</style>` : "";
  const header = shell.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
  const footer = shell.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";

  const screens: string[] = [];
  for (const page of PAGES) {
    const html = page.id === PAGES[0].id ? shell : await buildPage(page, logo);
    const start = html.indexOf("<main");
    const end = html.lastIndexOf("</main>");
    if (start === -1 || end === -1) throw new Error(`Ingen main i ${page.id}`);
    const main = html.slice(start, end + "</main>".length);
    screens.push(`<div class="screen" data-screen="${page.id}" hidden>${main}</div>`);
  }

  // Links between the exported files become view switches.
  const toView = (markup: string): string =>
    markup.replace(/href="birdie-open-([a-z-]+)\.html"/g, (_m, id: string) => `href="#${id}" data-view="${id}"`);

  return `<title>Birdie Open Redesign</title>
${style}
${fontRoot}
<style>
  .screen[hidden] { display: none; }
  .screen { animation: bo-fade 0.18s ease-out; }
  @keyframes bo-fade { from { opacity: 0; } to { opacity: 1; } }
</style>
<div class="shell">
${toView(header)}
${toView(screens.join("\n"))}
${footer}
</div>
<script>
(function () {
  var screens = document.querySelectorAll("[data-screen]");
  var links = document.querySelectorAll("[data-view]");

  function show(id) {
    var found = false;
    screens.forEach(function (screen) {
      var match = screen.dataset.screen === id;
      screen.hidden = !match;
      if (match) found = true;
    });
    if (!found) return show("forside");

    links.forEach(function (link) {
      // The header nav marks the current screen; in-page buttons do not.
      if (!link.classList.contains("nav__link")) return;
      if (link.dataset.view === id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    if (history.replaceState) history.replaceState(null, "", "#" + id);
    window.scrollTo(0, 0);
  }

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      show(link.dataset.view);
    });
  });

  window.addEventListener("hashchange", function () {
    show(location.hash.slice(1) || "forside");
  });

  show(location.hash.slice(1) || "forside");
})();
</script>
`;
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
    await writeFile(path.join(OUT, fileFor(page.id)), html, "utf8");

    const external = [
      ...html.matchAll(/(?:src|href)="((?:https?:\/\/|\/)[^"#][^"]*)"/g),
      ...html.matchAll(/url\(((?:\.\.\/|\/)[^)]*)\)/g),
    ]
      .map((m) => m[1])
      .filter((href) => !ALLOWED.includes(href));

    const size = `${Math.round(Buffer.byteLength(html) / 1024)} KB`;
    console.log(`  ${fileFor(page.id).padEnd(38)} ${size.padStart(7)}  ${page.title}`);
    if (external.length > 0) {
      leaks += external.length;
      console.error(`     henter stadig udefra: ${[...new Set(external)].slice(0, 4).join(", ")}`);
    }
  }

  const readme = [
    "# Birdie Open, designet som HTML",
    "",
    "En fil pr. skærm. Start med `birdie-open-forside.html` og klik dig rundt i",
    "menuen. Alt er indlejret i filen:",
    "stylesheet, skrifter og logo, så de virker uden server og uden internet.",
    "",
    "Data er de rigtige tal fra sæson 2026.",
    "",
    ...PAGES.map((p) => `- \`${fileFor(p.id)}\` — ${p.title}. ${p.note}`),
    "",
    "Og `birdie-open-design.html`, hvor alle skærme ligger i samme fil og menuen",
    "skifter mellem dem. Den er nemmest at sende videre.",
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

  await writeFile(path.join(OUT, "LAESMIG.md"), `${readme}\n`, "utf8");

  const single = await buildSingleFile(logo);
  await writeFile(path.join(OUT, "birdie-open-design.html"), single, "utf8");
  console.log(
    `  ${"birdie-open-design.html".padEnd(38)} ${`${Math.round(Buffer.byteLength(single) / 1024)} KB`.padStart(7)}  Alle skærme i én fil`,
  );

  if (leaks > 0) {
    console.error(`\n${leaks} referencer peger ud af filerne. De virker ikke offline.`);
    process.exit(1);
  }
  console.log(`\n${PAGES.length + 1} filer i design-html/. Alt er indlejret.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
