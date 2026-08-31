import { describe, expect, it } from "vitest";
import {
  absenceScore,
  carryoverPoints,
  computeFinalRound,
  finalRoundPoints,
  finalScaleForYear,
  holePoints,
  rankBirdies,
  rankBy,
  roundAverage,
  roundWinner,
  scoreRound,
  strokesOnHole,
} from "../index";

describe("stableford", () => {
  it("gives the hardest holes the extra strokes first", () => {
    expect(strokesOnHole(11, 1)).toBe(1);
    expect(strokesOnHole(11, 11)).toBe(1);
    expect(strokesOnHole(11, 12)).toBe(0);
    expect(strokesOnHole(0, 1)).toBe(0);
  });

  it("wraps past 18 strokes", () => {
    expect(strokesOnHole(22, 4)).toBe(2);
    expect(strokesOnHole(22, 5)).toBe(1);
  });

  it("scores a hole off the net score", () => {
    expect(holePoints(5, 4, 0)).toBe(1);
    expect(holePoints(5, 5, 1)).toBe(3);
    expect(holePoints(8, 4, 0)).toBe(0);
    expect(holePoints(null, 4, 1)).toBe(0);
  });

  // Jon Fogh, Skanderborg 26/4 2026: handicap 9.1, 11 strokes, 34 points.
  it("reproduces a scorecard from the archive", () => {
    const holes = [
      { hole: 1, par: 4, key: 12 },
      { hole: 2, par: 5, key: 10 },
      { hole: 3, par: 4, key: 6 },
      { hole: 4, par: 3, key: 14 },
      { hole: 5, par: 4, key: 8 },
      { hole: 6, par: 3, key: 18 },
      { hole: 7, par: 4, key: 4 },
      { hole: 8, par: 3, key: 16 },
      { hole: 9, par: 4, key: 2 },
      { hole: 10, par: 5, key: 5 },
      { hole: 11, par: 4, key: 7 },
      { hole: 12, par: 4, key: 9 },
      { hole: 13, par: 3, key: 13 },
      { hole: 14, par: 4, key: 17 },
      { hole: 15, par: 4, key: 11 },
      { hole: 16, par: 4, key: 1 },
      { hole: 17, par: 3, key: 15 },
      { hole: 18, par: 4, key: 3 },
    ];
    const gross: Record<number, number> = {
      1: 5, 2: 5, 3: 6, 4: 3, 5: 5, 6: 3, 7: 5, 8: 4, 9: 6,
      10: 6, 11: 4, 12: 5, 13: 3, 14: 5, 15: 4, 16: 5, 17: 3, 18: 5,
    };

    const result = scoreRound(holes, gross, 11);
    expect(result.total).toBe(34);
    expect(result.front).toBe(15);
    expect(result.back).toBe(19);
    expect(result.played).toBe(18);
  });

  it("counts only the holes that have been played", () => {
    const holes = [
      { hole: 1, par: 4, key: 1 },
      { hole: 2, par: 4, key: 2 },
    ];
    const result = scoreRound(holes, { 1: 4 }, 0);
    expect(result.played).toBe(1);
    expect(result.total).toBe(2);
  });
});

describe("placering", () => {
  it("shares a place and skips the next", () => {
    const ranked = rankBy(
      [
        { id: "a", p: 239 },
        { id: "b", p: 236 },
        { id: "c", p: 236 },
        { id: "d", p: 230 },
      ],
      (x) => x.p,
    );
    expect(ranked.map((r) => r.place)).toEqual([1, 2, 2, 4]);
  });

  it("breaks a round tie on the back nine, then on handicap", () => {
    const winner = roundWinner([
      { id: "a", total: 36, back: 17, handicap: 12 },
      { id: "b", total: 36, back: 19, handicap: 20 },
    ]);
    expect(winner?.id).toBe("b");

    const onHandicap = roundWinner([
      { id: "a", total: 36, back: 18, handicap: 12 },
      { id: "b", total: 36, back: 18, handicap: 20 },
    ]);
    expect(onHandicap?.id).toBe("a");
  });
});

describe("afbud", () => {
  it("averages the players who did play", () => {
    expect(roundAverage([{ playerId: "a", points: 30 }, { playerId: "b", points: 33 }, { playerId: "c", points: null }])).toBe(32);
  });

  it("deducts more for each further absence", () => {
    expect(absenceScore(30, 1)).toBe(30);
    expect(absenceScore(30, 2)).toBe(28);
    expect(absenceScore(30, 3)).toBe(27);
    expect(absenceScore(30, 4)).toBe(26);
    expect(absenceScore(30, 7)).toBe(25);
  });
});

describe("finalen", () => {
  // Birdie Open 2026 had 13 finalists: leader carried 26, and the floor was 13.
  it("carries points on the observed 2026 scale", () => {
    expect(carryoverPoints(1, 13)).toBe(26);
    expect(carryoverPoints(2, 13)).toBe(24);
    expect(carryoverPoints(4, 13)).toBe(20);
    expect(carryoverPoints(6, 13)).toBe(16);
    expect(carryoverPoints(7, 13)).toBe(14);
    expect(carryoverPoints(8, 13)).toBe(13);
    expect(carryoverPoints(13, 13)).toBe(13);
  });

  // Lohersand, 28/8 2026: 39 points won 26, four players tied on 28 took 12 each,
  // and the next player down dropped to 4.
  it("awards a final round like Lohersand 2026", () => {
    const rows = computeFinalRound(
      [
        { playerId: "kristensen", points: 39 },
        { playerId: "rasmus", points: 38 },
        { playerId: "lund", points: 35 },
        { playerId: "meincke", points: 34 },
        { playerId: "casper", points: 33 },
        { playerId: "dubbelman", points: 31 },
        { playerId: "stefan", points: 29 },
        { playerId: "schmidt", points: 28 },
        { playerId: "simonsen", points: 28 },
        { playerId: "hjortbak", points: 28 },
        { playerId: "gregersen", points: 28 },
        { playerId: "andreas", points: 27 },
        { playerId: "fogh", points: 25 },
      ],
      13,
      2,
    );
    const awarded = Object.fromEntries(rows.map((r) => [r.playerId, r.awarded]));
    expect(awarded.kristensen).toBe(26);
    expect(awarded.rasmus).toBe(24);
    expect(awarded.lund).toBe(22);
    expect(awarded.meincke).toBe(20);
    expect(awarded.casper).toBe(18);
    expect(awarded.dubbelman).toBe(16);
    expect(awarded.stefan).toBe(14);
    expect(awarded.schmidt).toBe(12);
    expect(awarded.gregersen).toBe(12);
    expect(awarded.andreas).toBe(4);
    expect(awarded.fogh).toBe(2);
  });

  it("never awards below zero", () => {
    expect(finalRoundPoints(20, 13)).toBe(0);
  });

  // Through 2022 a win in a final round was worth the number of finalists;
  // from 2023 the tournament doubled the scale.
  it("uses the scale in force that season", () => {
    expect(finalScaleForYear(2022)).toBe(1);
    expect(finalScaleForYear(2023)).toBe(2);
    expect(finalRoundPoints(1, 14, 1)).toBe(14);
    expect(finalRoundPoints(2, 14, 1)).toBe(13);
    expect(finalRoundPoints(14, 14, 1)).toBe(1);
    expect(finalRoundPoints(1, 14, 2)).toBe(28);
  });
});

describe("birdielisten", () => {
  it("counts an eagle as three birdies", () => {
    const rows = rankBirdies([
      { playerId: "a", key: 10, points: 5, type: "eagle" },
      { playerId: "b", key: 1, points: 4, type: "birdie" },
      { playerId: "b", key: 2, points: 4, type: "birdie" },
    ]);
    expect(rows[0].playerId).toBe("a");
    expect(rows[0].count).toBe(3);
  });

  it("breaks a tie on the hardest holes, then on points", () => {
    const rows = rankBirdies([
      { playerId: "a", key: 18, points: 4, type: "birdie" },
      { playerId: "b", key: 1, points: 4, type: "birdie" },
    ]);
    expect(rows[0].playerId).toBe("b");

    const onPoints = rankBirdies([
      { playerId: "a", key: 5, points: 3, type: "birdie" },
      { playerId: "b", key: 5, points: 4, type: "birdie" },
    ]);
    expect(onPoints[0].playerId).toBe("b");
  });
});
