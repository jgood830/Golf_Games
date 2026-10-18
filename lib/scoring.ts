/**
 * Pure, framework-free scoring logic for a golf skins + closest-to-the-pin game.
 * No React, no browser APIs — safe to reuse on a server later.
 */

export const HOLES = 18;

export const DEFAULT_HOLE_HANDICAPS: readonly number[] = [
  7, 11, 15, 1, 3, 17, 13, 5, 9, 8, 16, 2, 12, 4, 18, 10, 6, 14,
];

export interface Player {
  id: string;
  name: string;
  /** Strokes given, whole number 0–36. */
  strokes: number;
}

export interface GameSettings {
  /** Paid by each other player to the winner, per skin. */
  skinValue: number;
  /** Paid by each other player to the winner, per CTP. */
  ctpValue: number;
  carryover: boolean;
  /** A CTP hole nobody wins rolls its value to the next CTP hole. */
  ctpCarryover: boolean;
}

export interface CtpEntry {
  id: string;
  hole: number;
  winnerId: string | null;
  /** Explicitly marked as won by nobody (e.g. no one on the green). */
  noWinner: boolean;
  notes: string;
}

/** Gross score per player id, indexed by hole (0-based). null = not entered. */
export type Scores = Record<string, (number | null)[]>;

export interface Round {
  players: Player[];
  settings: GameSettings;
  /** Hole handicap per hole (0-based index). null = not entered. */
  holeHandicaps: (number | null)[];
  scores: Scores;
  ctps: CtpEntry[];
}

export type HoleStatus = "won" | "tie" | "incomplete";

export interface HoleResult {
  /** 1-based hole number. */
  hole: number;
  handicap: number | null;
  status: HoleStatus;
  /** Strokes received on this hole, per player id. */
  strokes: Record<string, number>;
  /** Net score per player id, null if no gross entered. */
  net: Record<string, number | null>;
  winnerId: string | null;
  carriedIn: number;
  /** Skins awarded to the winner (0 unless status is "won"). */
  skinsAwarded: number;
  /** Value of the hole if it were won right now: 1 + carriedIn. */
  worth: number;
}

export type CtpStatus = "won" | "none" | "pending";

export interface CtpResult {
  id: string;
  hole: number;
  status: CtpStatus;
  winnerId: string | null;
  carriedIn: number;
  /** CTPs awarded to the winner (0 unless status is "won"). */
  ctpsAwarded: number;
  /** Value of the entry if it were won: 1 + carriedIn. */
  worth: number;
}

export interface PlayerResult {
  playerId: string;
  name: string;
  strokes: number;
  skins: number;
  skinsNet: number;
  ctps: number;
  ctpNet: number;
  totalNet: number;
}

export interface Payment {
  fromId: string;
  toId: string;
  /** Dollars, rounded to cents. */
  amount: number;
}

export interface RoundResults {
  holes: HoleResult[];
  players: PlayerResult[];
  totalSkins: number;
  totalCtps: number;
  unclaimedCarryover: number;
  ctpResults: CtpResult[];
  /** CTPs still carrying after the last CTP entry (CTP carryover on only). */
  unclaimedCtpCarryover: number;
  payments: Payment[];
  /** Sum of all totalNet values; should always be 0. */
  balance: number;
}

/** Strokes a player with `strokesGiven` receives on a hole with handicap `holeHandicap`. */
export function strokesOnHole(strokesGiven: number, holeHandicap: number | null | undefined): number {
  if (holeHandicap == null || !Number.isFinite(holeHandicap)) return 0;
  const s = Number.isFinite(strokesGiven) ? Math.max(0, Math.floor(strokesGiven)) : 0;
  return Math.floor(s / HOLES) + (holeHandicap <= s % HOLES ? 1 : 0);
}

export function netScore(gross: number, strokes: number): number {
  return gross - strokes;
}

function isEntered(gross: number | null | undefined): gross is number {
  return typeof gross === "number" && Number.isFinite(gross);
}

export function computeHoles(round: Round): HoleResult[] {
  const { players, settings, holeHandicaps, scores } = round;
  const results: HoleResult[] = [];
  let carry = 0;

  for (let i = 0; i < HOLES; i++) {
    const handicap = holeHandicaps[i] ?? null;
    const strokes: Record<string, number> = {};
    const net: Record<string, number | null> = {};
    let complete = players.length >= 2;

    for (const p of players) {
      const s = strokesOnHole(p.strokes, handicap);
      strokes[p.id] = s;
      const gross = scores[p.id]?.[i];
      if (isEntered(gross)) {
        net[p.id] = netScore(gross, s);
      } else {
        net[p.id] = null;
        complete = false;
      }
    }

    const carriedIn = settings.carryover ? carry : 0;
    const worth = 1 + carriedIn;

    if (!complete) {
      // Incomplete holes award nothing and pass the carry through unchanged.
      results.push({ hole: i + 1, handicap, status: "incomplete", strokes, net, winnerId: null, carriedIn, skinsAwarded: 0, worth });
      continue;
    }

    const nets = players.map((p) => net[p.id] as number);
    const low = Math.min(...nets);
    const leaders = players.filter((p) => net[p.id] === low);

    if (leaders.length === 1) {
      results.push({ hole: i + 1, handicap, status: "won", strokes, net, winnerId: leaders[0].id, carriedIn, skinsAwarded: worth, worth });
      carry = 0;
    } else {
      results.push({ hole: i + 1, handicap, status: "tie", strokes, net, winnerId: null, carriedIn, skinsAwarded: 0, worth });
      carry = settings.carryover ? carry + 1 : 0;
    }
  }

  return results;
}

/** Skins left on the table when hole 18 ties with carryover on. */
export function unclaimedCarryover(holes: HoleResult[], settings: GameSettings): number {
  const last = holes[HOLES - 1];
  if (!settings.carryover || !last || last.status !== "tie") return 0;
  return last.carriedIn + 1;
}

/**
 * Resolve CTP entries in hole order. An entry with a valid winner is won; one
 * marked noWinner is "none" (carries if CTP carryover is on, otherwise lost);
 * anything else is pending and, like an incomplete hole, passes the carry through.
 */
export function computeCtps(round: Round): { results: CtpResult[]; unclaimed: number } {
  const ids = new Set(round.players.map((p) => p.id));
  const carryover = round.settings.ctpCarryover;
  const ordered = round.ctps.map((c, i) => ({ c, i })).sort((a, b) => a.c.hole - b.c.hole || a.i - b.i);
  const byId = new Map<string, CtpResult>();
  let carry = 0;

  for (const { c } of ordered) {
    const carriedIn = carryover ? carry : 0;
    const worth = 1 + carriedIn;
    const base = { id: c.id, hole: c.hole, carriedIn, worth };
    if (c.winnerId && ids.has(c.winnerId)) {
      byId.set(c.id, { ...base, status: "won", winnerId: c.winnerId, ctpsAwarded: worth });
      carry = 0;
    } else if (c.noWinner) {
      byId.set(c.id, { ...base, status: "none", winnerId: null, ctpsAwarded: 0 });
      carry = carryover ? carry + 1 : 0;
    } else {
      byId.set(c.id, { ...base, status: "pending", winnerId: null, ctpsAwarded: 0 });
    }
  }

  // Keep the caller's entry order so the UI list lines up.
  return { results: round.ctps.map((c) => byId.get(c.id)!), unclaimed: carryover ? carry : 0 };
}

const toCents = (dollars: number) => Math.round(dollars * 100);

/**
 * Greedy settlement: repeatedly match the largest payer with the largest
 * collector and transfer the smaller of the two amounts.
 */
export function settle(balances: { playerId: string; amount: number }[]): Payment[] {
  const order = new Map(balances.map((b, i) => [b.playerId, i]));
  const payers = balances.filter((b) => toCents(b.amount) < 0).map((b) => ({ id: b.playerId, cents: -toCents(b.amount) }));
  const collectors = balances.filter((b) => toCents(b.amount) > 0).map((b) => ({ id: b.playerId, cents: toCents(b.amount) }));
  const byLargest = (a: { id: string; cents: number }, b: { id: string; cents: number }) =>
    b.cents - a.cents || order.get(a.id)! - order.get(b.id)!;

  const payments: Payment[] = [];
  for (;;) {
    payers.sort(byLargest);
    collectors.sort(byLargest);
    const payer = payers[0];
    const collector = collectors[0];
    if (!payer || !collector || payer.cents <= 0 || collector.cents <= 0) break;
    const cents = Math.min(payer.cents, collector.cents);
    payments.push({ fromId: payer.id, toId: collector.id, amount: cents / 100 });
    payer.cents -= cents;
    collector.cents -= cents;
    if (payer.cents === 0) payers.shift();
    if (collector.cents === 0) collectors.shift();
  }
  return payments;
}

export function computeResults(round: Round): RoundResults {
  const { players, settings } = round;
  const P = players.length;
  const holes = computeHoles(round);
  const ctpOutcome = computeCtps(round);

  const skinsBy: Record<string, number> = {};
  const ctpsBy: Record<string, number> = {};
  for (const p of players) {
    skinsBy[p.id] = 0;
    ctpsBy[p.id] = 0;
  }
  for (const h of holes) {
    if (h.status === "won" && h.winnerId) skinsBy[h.winnerId] += h.skinsAwarded;
  }
  for (const c of ctpOutcome.results) {
    if (c.status === "won" && c.winnerId) ctpsBy[c.winnerId] += c.ctpsAwarded;
  }

  const totalSkins = players.reduce((sum, p) => sum + skinsBy[p.id], 0);
  const totalCtps = players.reduce((sum, p) => sum + ctpsBy[p.id], 0);

  const playerResults: PlayerResult[] = players.map((p) => {
    const skinsNet = settings.skinValue * (P * skinsBy[p.id] - totalSkins);
    const ctpNet = settings.ctpValue * (P * ctpsBy[p.id] - totalCtps);
    return {
      playerId: p.id,
      name: p.name,
      strokes: p.strokes,
      skins: skinsBy[p.id],
      skinsNet,
      ctps: ctpsBy[p.id],
      ctpNet,
      totalNet: skinsNet + ctpNet,
    };
  });

  const balance = playerResults.reduce((sum, r) => sum + toCents(r.totalNet), 0) / 100;
  const payments = settle(playerResults.map((r) => ({ playerId: r.playerId, amount: r.totalNet })));

  return {
    holes,
    players: playerResults,
    totalSkins,
    totalCtps,
    unclaimedCarryover: unclaimedCarryover(holes, settings),
    ctpResults: ctpOutcome.results,
    unclaimedCtpCarryover: ctpOutcome.unclaimed,
    payments,
    balance,
  };
}

/** Hole handicap values (1–18) used more than once. */
export function duplicateHandicaps(holeHandicaps: (number | null)[]): Set<number> {
  const seen = new Set<number>();
  const dupes = new Set<number>();
  for (const h of holeHandicaps) {
    if (h == null) continue;
    if (seen.has(h)) dupes.add(h);
    seen.add(h);
  }
  return dupes;
}

export function formatMoney(amount: number): string {
  const cents = Math.abs(toCents(amount));
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatSigned(amount: number): string {
  const cents = toCents(amount);
  if (cents === 0) return "$0.00";
  return `${cents > 0 ? "+" : "−"}${formatMoney(amount)}`;
}

export function playerStatus(totalNet: number): string {
  const cents = toCents(totalNet);
  if (cents > 0) return `Collects ${formatMoney(totalNet)}`;
  if (cents < 0) return `Pays ${formatMoney(totalNet)}`;
  return "Even";
}
