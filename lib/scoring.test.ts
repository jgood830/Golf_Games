import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOLE_HANDICAPS,
  HOLES,
  computeHoles,
  computeResults,
  duplicateHandicaps,
  settle,
  strokesOnHole,
  type Player,
  type Round,
  type Scores,
} from "./scoring";
import { buildSummary } from "./summary";

const makePlayers = (strokes: number[]): Player[] =>
  strokes.map((s, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, strokes: s }));

const emptyScores = (players: Player[]): Scores =>
  Object.fromEntries(players.map((p) => [p.id, Array<number | null>(HOLES).fill(null)]));

function makeRound(overrides: Partial<Round> & { players: Player[] }): Round {
  return {
    settings: { skinValue: 2, ctpValue: 2, carryover: true },
    holeHandicaps: [...DEFAULT_HOLE_HANDICAPS],
    scores: emptyScores(overrides.players),
    ctps: [],
    ...overrides,
  };
}

/** Enter gross scores for one hole (0-based index), one per player in order. */
function setHole(round: Round, holeIndex: number, gross: (number | null)[]) {
  round.players.forEach((p, i) => {
    round.scores[p.id][holeIndex] = gross[i];
  });
}

const netById = (round: Round) =>
  Object.fromEntries(computeResults(round).players.map((r) => [r.playerId, r.totalNet]));

describe("1. basic payout", () => {
  it("3 players, $2 skins, P1=9 P2=6 P3=3", () => {
    const players = makePlayers([0, 0, 0]);
    const round = makeRound({ players });
    const winners = [...Array(9).fill(0), ...Array(6).fill(1), ...Array(3).fill(2)];
    winners.forEach((w, hole) => setHole(round, hole, players.map((_, i) => (i === w ? 3 : 4))));

    const results = computeResults(round);
    expect(results.players.map((r) => r.skins)).toEqual([9, 6, 3]);
    expect(results.totalSkins).toBe(18);
    expect(results.players.map((r) => r.totalNet)).toEqual([18, 0, -18]);
    expect(results.payments).toEqual([{ fromId: "p3", toId: "p1", amount: 18 }]);

    const summary = buildSummary(round, results);
    expect(summary).toContain("Player 3 pays Player 1 $18.00");
  });
});

describe("2. strokes", () => {
  it("handicap-7 hole, strokes 0/8/12, gross 5/4/6 → net 5/3/5, P2 wins", () => {
    const players = makePlayers([0, 8, 12]);
    const handicaps = Array<number | null>(HOLES).fill(null);
    handicaps[0] = 7;
    const round = makeRound({ players, holeHandicaps: handicaps });
    setHole(round, 0, [5, 4, 6]);

    const hole = computeHoles(round)[0];
    expect(hole.net).toEqual({ p1: 5, p2: 3, p3: 5 });
    expect(hole.status).toBe("won");
    expect(hole.winnerId).toBe("p2");
  });
});

describe("3. two strokes", () => {
  it("S=20 gets 2 on hcp 1 and 2, 1 on hcp 3 and 18", () => {
    expect(strokesOnHole(20, 1)).toBe(2);
    expect(strokesOnHole(20, 2)).toBe(2);
    expect(strokesOnHole(20, 3)).toBe(1);
    expect(strokesOnHole(20, 18)).toBe(1);
  });

  it("S=8 gets one stroke on hcp 1–8 only; no handicap → 0", () => {
    for (let h = 1; h <= 18; h++) expect(strokesOnHole(8, h)).toBe(h <= 8 ? 1 : 0);
    expect(strokesOnHole(8, null)).toBe(0);
    expect(strokesOnHole(36, 18)).toBe(2);
    expect(strokesOnHole(0, 1)).toBe(0);
  });
});

function carryoverRound(carryover: boolean): Round {
  const players = makePlayers([0, 8, 20]);
  const round = makeRound({ players, settings: { skinValue: 2, ctpValue: 2, carryover } });
  setHole(round, 0, [5, 4, 6]);
  setHole(round, 1, [4, 4, 4]);
  setHole(round, 2, [5, 5, 6]);
  setHole(round, 3, [5, 5, 6]);
  setHole(round, 4, [3, 5, 6]);
  round.ctps = [{ id: "c1", hole: 3, winnerId: "p1", notes: "" }];
  return round;
}

describe("4. carryover", () => {
  it("matches the worked example hole by hole", () => {
    const round = carryoverRound(true);
    // Default handicaps for holes 1–5 are 7, 11, 15, 1, 3.
    expect(round.holeHandicaps.slice(0, 5)).toEqual([7, 11, 15, 1, 3]);
    const holes = computeHoles(round).slice(0, 5);

    expect(holes.map((h) => [h.net.p1, h.net.p2, h.net.p3])).toEqual([
      [5, 3, 5],
      [4, 4, 3],
      [5, 5, 5],
      [5, 4, 4],
      [3, 4, 5],
    ]);
    expect(holes.map((h) => h.winnerId ?? h.status)).toEqual(["p2", "p3", "tie", "tie", "p1"]);
    expect(holes.map((h) => h.carriedIn)).toEqual([0, 0, 0, 1, 2]);
    expect(holes.map((h) => h.skinsAwarded)).toEqual([1, 1, 0, 0, 3]);
  });

  it("pays out skins and CTP correctly", () => {
    const results = computeResults(carryoverRound(true));
    expect(results.players.map((r) => r.skinsNet)).toEqual([8, -4, -4]);
    expect(results.players.map((r) => r.ctpNet)).toEqual([4, -2, -2]);
    expect(results.players.map((r) => r.totalNet)).toEqual([12, -6, -6]);
    expect(results.balance).toBe(0);
    expect(results.payments).toEqual([
      { fromId: "p2", toId: "p1", amount: 6 },
      { fromId: "p3", toId: "p1", amount: 6 },
    ]);
  });
});

describe("5. carryover off", () => {
  it("hole 5 is worth 1 skin and tied skins are lost", () => {
    const round = carryoverRound(false);
    const holes = computeHoles(round).slice(0, 5);
    expect(holes.map((h) => h.carriedIn)).toEqual([0, 0, 0, 0, 0]);
    expect(holes[4].skinsAwarded).toBe(1);

    const results = computeResults(round);
    expect(results.players.map((r) => r.skins)).toEqual([1, 1, 1]);
    expect(results.players.map((r) => r.skinsNet)).toEqual([0, 0, 0]);
    expect(results.players.map((r) => r.totalNet)).toEqual([4, -2, -2]);
  });
});

describe("6. incomplete hole in a carry chain", () => {
  it("passes the carry through unchanged", () => {
    const players = makePlayers([0, 0, 0]);
    const round = makeRound({ players });
    setHole(round, 0, [4, 4, 5]); // tie
    setHole(round, 1, [4, null, 5]); // incomplete
    setHole(round, 2, [3, 3, 3]); // tie
    setHole(round, 3, [5, 4, 5]); // P2 wins

    const holes = computeHoles(round);
    expect(holes.slice(0, 4).map((h) => h.status)).toEqual(["tie", "incomplete", "tie", "won"]);
    expect(holes.slice(0, 4).map((h) => h.carriedIn)).toEqual([0, 1, 1, 2]);
    expect(holes[1].skinsAwarded).toBe(0);
    expect(holes[3].skinsAwarded).toBe(3);
    expect(computeResults(round).players.map((r) => r.skins)).toEqual([0, 3, 0]);
  });

  it("requires at least 2 players for a complete hole", () => {
    const players = makePlayers([0]);
    const round = makeRound({ players });
    setHole(round, 0, [4]);
    expect(computeHoles(round)[0].status).toBe("incomplete");
  });
});

describe("7. unclaimed carryover", () => {
  it("reports carriedIn + 1 when hole 18 ties", () => {
    const players = makePlayers([0, 0]);
    const round = makeRound({ players });
    for (let h = 0; h < 16; h++) setHole(round, h, [4, 5]); // P1 wins 1–16
    setHole(round, 16, [4, 4]); // tie
    setHole(round, 17, [4, 4]); // tie

    const results = computeResults(round);
    expect(results.holes[17].carriedIn).toBe(1);
    expect(results.unclaimedCarryover).toBe(2);
    expect(results.totalSkins).toBe(16);
    expect(results.players.map((r) => r.totalNet)).toEqual([32, -32]);
  });

  it("is 0 when carryover is off or hole 18 is won", () => {
    const players = makePlayers([0, 0]);
    const off = makeRound({ players, settings: { skinValue: 2, ctpValue: 2, carryover: false } });
    setHole(off, 17, [4, 4]);
    expect(computeResults(off).unclaimedCarryover).toBe(0);

    const won = makeRound({ players });
    setHole(won, 16, [4, 4]);
    setHole(won, 17, [3, 4]);
    expect(computeResults(won).unclaimedCarryover).toBe(0);
  });
});

describe("8. totals always sum to zero", () => {
  // Small deterministic PRNG so failures are reproducible.
  function mulberry32(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("over 500 random rounds", () => {
    const rand = mulberry32(12345);
    const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
    const values = [0, 0.5, 1, 2, 2.5, 5, 10];

    for (let trial = 0; trial < 500; trial++) {
      const n = int(2, 6);
      const players = makePlayers(Array.from({ length: n }, () => int(0, 36)));
      const round = makeRound({
        players,
        settings: {
          skinValue: values[int(0, values.length - 1)],
          ctpValue: values[int(0, values.length - 1)],
          carryover: rand() < 0.5,
        },
      });
      for (let h = 0; h < HOLES; h++) {
        setHole(round, h, players.map(() => (rand() < 0.1 ? null : int(2, 9))));
      }
      round.ctps = Array.from({ length: int(0, 4) }, (_, i) => ({
        id: `c${i}`,
        hole: int(1, 18),
        winnerId: rand() < 0.2 ? null : players[int(0, n - 1)].id,
        notes: "",
      }));

      const results = computeResults(round);
      const sum = results.players.reduce((s, r) => s + r.totalNet, 0);
      expect(Math.abs(sum)).toBeLessThan(1e-9);
      expect(results.balance).toBe(0);

      // Settlement brings everyone to exactly $0.
      const left = netById(round);
      for (const p of results.payments) {
        expect(p.amount).toBeGreaterThan(0);
        left[p.fromId] += p.amount;
        left[p.toId] -= p.amount;
      }
      for (const v of Object.values(left)) expect(Math.abs(v)).toBeLessThan(0.005);
      expect(results.payments.length).toBeLessThanOrEqual(n - 1);
    }
  });
});

describe("helpers", () => {
  it("settle matches largest payer with largest collector", () => {
    expect(
      settle([
        { playerId: "a", amount: 10 },
        { playerId: "b", amount: 5 },
        { playerId: "c", amount: -12 },
        { playerId: "d", amount: -3 },
      ]),
    ).toEqual([
      { fromId: "c", toId: "a", amount: 10 },
      { fromId: "d", toId: "b", amount: 3 },
      { fromId: "c", toId: "b", amount: 2 },
    ]);
  });

  it("finds duplicate hole handicaps", () => {
    expect(duplicateHandicaps([...DEFAULT_HOLE_HANDICAPS]).size).toBe(0);
    expect([...duplicateHandicaps([1, 2, 2, null, null, 3, 3])]).toEqual([2, 3]);
  });
});
