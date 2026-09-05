import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

const BASE = "https://www.birdieopen.dk/index.php";
const CACHE_DIR = path.join(process.cwd(), ".cache", "legacy");
const DELAY_MS = 350;

let browser: Browser | null = null;
let page: Page | null = null;

/**
 * Simply.com's firewall answers plain HTTP clients with a JavaScript challenge,
 * so every request goes through a real Chromium that keeps the challenge cookie.
 */
async function getPage(): Promise<Page> {
  if (page) return page;
  browser = await chromium.launch();
  const context = await browser.newContext({
    locale: "da-DK",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  });
  page = await context.newPage();
  await page.goto("https://www.birdieopen.dk/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  return page;
}

export async function closeBrowser(): Promise<void> {
  await browser?.close();
  browser = null;
  page = null;
}

function cachePath(url: string): string {
  return path.join(CACHE_DIR, `${createHash("sha1").update(url).digest("hex")}.html`);
}

/** Pass --fresh to ignore the cache and pull the pages again. */
const FRESH = process.argv.includes("--fresh");

/** Fetches a legacy page, caching to disk so a rerun never re-hits their server. */
export async function fetchPage(pathname: string): Promise<string> {
  const url = `${BASE}/${pathname}`;
  const file = cachePath(url);
  if (!FRESH) {
    try {
      const cached = await readFile(file, "utf8");
      if (cached.length > 0) return cached;
    } catch {
      // not cached yet
    }
  }

  const p = await getPage();
  const html = await p.evaluate(async (target) => {
    const res = await fetch(target, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${target}`);
    return res.text();
  }, url);

  if (html.includes("Checking your browser") || html.includes("Security Incident")) {
    throw new Error(`Firewall blocked ${url}`);
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, html, "utf8");
  await p.waitForTimeout(DELAY_MS);
  return html;
}

export async function writeJson(name: string, data: unknown): Promise<void> {
  const dir = path.join(process.cwd(), "data", "legacy");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
