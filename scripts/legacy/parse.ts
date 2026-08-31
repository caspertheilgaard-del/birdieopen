import * as cheerio from "cheerio";
import type {
  LegacyBirdieRow,
  LegacyPlayers,
  LegacyScheduleRound,
  LegacyScorecard,
  LegacyStandings,
  LegacyStandingsSection,
} from "./types";

const SCORECARD_RE = /stilling\/scorecard\/(\d+)\/(\d+)/;

function clean(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

function num(s: string): number | null {
  const m = clean(s).match(/-?\d+([.,]\d+)?/);
  return m ? Number(m[0].replace(",", ".")) : null;
}

export function parseStandings(html: string, seasonLegacyId: string, year: number): LegacyStandings {
  const $ = cheerio.load(html);
  const sections: LegacyStandingsSection[] = [];

  $("table.dataTable").each((_, table) => {
    const $t = $(table);
    const rows = $t.find("tr").toArray();
    if (rows.length < 3) return;

    const banner = clean($(rows[0]).text());
    const kind: "prelim" | "final" = /finale/i.test(banner) ? "final" : "prelim";

    const headCells = $(rows[1]).find("th, td").toArray();
    // Leading label columns, then one column per round, then Point / Til top / Placering.
    const leading = headCells.findIndex((c) => /point før finale/i.test(clean($(c).text()))) >= 0 ? 2 : 1;
    const tailLabels = ["point", "til top", "placering"];
    let tail = 0;
    for (let i = headCells.length - 1; i >= 0 && tail < 3; i -= 1) {
      if (tailLabels.includes(clean($(headCells[i]).text()).toLowerCase())) tail += 1;
      else break;
    }

    const columns = headCells.slice(leading, headCells.length - tail).map((cell, index) => {
      const $c = $(cell);
      const when = clean($c.find("span").text());
      const venue = clean($c.clone().find("span").remove().end().text());
      return { index, legacyRoundId: null as string | null, venue, when };
    });

    const dataRows = rows.slice(2).filter((r) => $(r).find("td").length > 1);
    const parsed = dataRows.map((row) => {
      const cells = $(row).find("td").toArray();
      const playerName = clean($(cells[0]).text());
      let legacyPlayerId: string | null = null;

      const carryover = leading === 2 ? num($(cells[1]).text()) : null;
      const roundCells = cells.slice(leading, cells.length - tail);

      const parsedCells = roundCells.map((cell, columnIndex) => {
        const $c = $(cell);
        const href = $c.find("a").attr("href") ?? "";
        const m = href.match(SCORECARD_RE);
        if (m) {
          legacyPlayerId = m[2];
          if (columns[columnIndex]) columns[columnIndex].legacyRoundId = m[1];
        }
        const text = clean($c.text());
        // Finals render "20 (34 point)"; preliminaries render a bare number.
        const paren = text.match(/^(-?\d+)\s*\((\d+)\s*point\)$/i);
        return {
          columnIndex,
          value: paren ? Number(paren[1]) : num(text),
          stableford: paren ? Number(paren[2]) : null,
          average: ($c.attr("class") ?? "").includes("stilling_avg"),
          legacyRoundId: m ? m[1] : null,
        };
      });

      const tailCells = tail > 0 ? cells.slice(cells.length - tail) : [];
      const total = tailCells[0] ? num($(tailCells[0]).text()) : null;
      const behind = tailCells[1] ? clean($(tailCells[1]).text()) : "";
      const place = tailCells[2] ? num($(tailCells[2]).text()) : null;

      return { playerName, legacyPlayerId, carryover, cells: parsedCells, total, behind, place };
    });

    sections.push({ kind, tableId: $t.attr("id") ?? "", columns, rows: parsed });
  });

  return { seasonLegacyId, year, sections };
}

export function parseScorecard(
  html: string,
  legacyRoundId: string,
  legacyPlayerId: string,
): LegacyScorecard | null {
  const $ = cheerio.load(html);

  // Metadata sits in single cells shaped "Label value", e.g. "Bane Skanderborg 2024".
  const fields = new Map<string, string>();
  const holes: LegacyScorecard["holes"] = [];

  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td, th")
      .toArray()
      .map((c) => clean($(c).text()));

    const hole = Number(cells[0]);
    if (cells.length >= 8 && Number.isInteger(hole) && hole >= 1 && hole <= 18) {
      holes.push({
        hole,
        length: num(cells[1]),
        key: num(cells[2]),
        par: num(cells[3]),
        strokes: (cells[4].match(/\|/g) ?? []).length,
        gross: num(cells[5]),
        points: num(cells[6]),
        running: num(cells[7]),
      });
      return;
    }

    for (const cell of cells) {
      const m = cell.match(/^(Turnering|Tidspunkt|Bane|Tee|Navn|Golfbox|Hcp\.|Slag:|Total)\s*(.+)$/);
      if (m && !fields.has(m[1])) fields.set(m[1], clean(m[2]));
    }
  });

  if (holes.length === 0) return null;

  return {
    legacyRoundId,
    legacyPlayerId,
    tournament: fields.get("Turnering") ?? "",
    playedAt: fields.get("Tidspunkt") ?? "",
    courseName: fields.get("Bane") ?? "",
    tee: fields.get("Tee") ?? "",
    playerName: fields.get("Navn") ?? "",
    golfbox: fields.get("Golfbox") ?? "",
    handicap: num(fields.get("Hcp.") ?? ""),
    strokesReceived: num(fields.get("Slag:") ?? ""),
    total: num(fields.get("Total") ?? ""),
    holes,
  };
}

export function parseBirdies(html: string): LegacyBirdieRow[] {
  const $ = cheerio.load(html);
  const out: LegacyBirdieRow[] = [];

  $("table")
    .first()
    .find("tr")
    .each((_, tr) => {
      const cells = $(tr).find("td").toArray();
      if (cells.length < 5) return;
      const place = num($(cells[0]).text());
      if (place === null) return;

      const detailText = cells[5] ? $(cells[5]) : $(cells[cells.length - 1]);
      const details: LegacyBirdieRow["details"] = [];
      detailText
        .html()
        ?.split(/<br\s*\/?>|<\/li>|<\/div>|<\/p>/i)
        .map((chunk) => clean(cheerio.load(`<x>${chunk}</x>`)("x").text()))
        .filter(Boolean)
        .forEach((line) => {
          // "14. Odder 2026(Nøgle 10, 3, Birdie)"
          const m = line.match(/^(\d+)\.\s*(.+?)\(Nøgle\s*(\d+),\s*(\d+),\s*([^)]+)\)$/i);
          if (!m) return;
          details.push({
            hole: Number(m[1]),
            courseLabel: clean(m[2]),
            key: Number(m[3]),
            points: Number(m[4]),
            type: clean(m[5]),
          });
        });

      out.push({
        place,
        playerName: clean($(cells[1]).text()),
        count: num($(cells[2]).text()),
        keySum: num($(cells[3]).text()),
        pointSum: num($(cells[4]).text()),
        details,
      });
    });

  return out;
}

export function parseSchedule(html: string): LegacyScheduleRound[] {
  const $ = cheerio.load(html);
  const out: LegacyScheduleRound[] = [];
  let group: "prelim" | "final" = "prelim";

  $("table")
    .first()
    .find("tr")
    .each((_, tr) => {
      const cells = $(tr).find("td").toArray();
      const rowText = clean($(tr).text());
      if (cells.length <= 1) {
        if (/finale/i.test(rowText)) group = "final";
        else if (/indledende/i.test(rowText)) group = "prelim";
        return;
      }
      if (cells.length < 3) return;

      const when = clean($(cells[0]).text());
      if (!/\d/.test(when)) return;

      const raw = $(cells[1]).html() ?? "";
      const lines = raw
        .split(/<br\s*\/?>/i)
        .map((chunk) => clean(cheerio.load(`<x>${chunk}</x>`)("x").text()))
        .filter(Boolean);
      const head = lines[0] ?? "";
      const address = lines.slice(1).join(", ");

      // "Skanderborg Golfklub (Skanderborg 2024) Par 69 (5402m)"
      const m = head.match(/^(.*?)\s*\((.*)\)\s*Par\s*(\d+)\s*\(([\d.]+)\s*m\)/i);
      const club = m ? clean(m[1]) : head;
      const courseName = m ? clean(m[2]) : "";
      const par = m ? Number(m[3]) : null;
      const lengthMeters = m ? Number(m[4].replace(".", "")) : null;

      const winnerText = clean($(cells[2]).text());
      const w = winnerText.match(/^(.*?)\s*-\s*(\d+)\s*point/i);

      out.push({
        group,
        when,
        club,
        courseName,
        par,
        lengthMeters,
        address,
        winnerName: w ? clean(w[1]) : null,
        winnerPoints: w ? Number(w[2]) : null,
        sponsor: cells[3] ? clean($(cells[3]).text()) : "",
      });
    });

  return out;
}

export function parsePlayers(html: string): LegacyPlayers {
  const $ = cheerio.load(html);
  const active: string[] = [];
  const former: string[] = [];
  let current: string[] | null = null;

  $("h2, h3").each((_, el) => {
    const text = clean($(el).text());
    const tag = $(el).prop("tagName")?.toLowerCase();
    if (tag === "h2") {
      if (/aktive deltagere/i.test(text)) current = active;
      else if (/tidligere deltagere/i.test(text)) current = former;
      else current = null;
      return;
    }
    if (current && text && text.length < 60 && !current.includes(text)) current.push(text);
  });

  return { active, former };
}
