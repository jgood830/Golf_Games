import { DEFAULT_HOLE_HANDICAPS, HOLES, type Player, type Round, type Scores } from "./scoring";

const STORAGE_KEY = "skins-tracker:v1";

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyScoresFor(players: Player[]): Scores {
  return Object.fromEntries(players.map((p) => [p.id, Array<number | null>(HOLES).fill(null)]));
}

export function defaultRound(): Round {
  const players: Player[] = [
    { id: newId(), name: "", strokes: 0 },
    { id: newId(), name: "", strokes: 0 },
  ];
  return {
    players,
    settings: { skinValue: 2, ctpValue: 2, carryover: true, ctpCarryover: false, startOnBack9: false },
    holeHandicaps: [...DEFAULT_HOLE_HANDICAPS],
    scores: emptyScoresFor(players),
    ctps: [],
  };
}

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Coerce whatever was in storage into a valid Round, filling gaps with defaults. */
function sanitize(raw: unknown): Round | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Round>;
  const base = defaultRound();
  if (!Array.isArray(r.players) || r.players.length === 0) return null;

  const players: Player[] = r.players.slice(0, 6).map((p) => ({
    id: typeof p?.id === "string" ? p.id : newId(),
    name: typeof p?.name === "string" ? p.name : "",
    strokes: num(p?.strokes, 0),
  }));

  const scores: Scores = {};
  for (const p of players) {
    const row = Array.isArray(r.scores?.[p.id]) ? r.scores![p.id] : [];
    scores[p.id] = Array.from({ length: HOLES }, (_, i) => numOrNull(row[i]));
  }

  const hh = Array.isArray(r.holeHandicaps) ? r.holeHandicaps : base.holeHandicaps;
  return {
    players,
    settings: {
      skinValue: num(r.settings?.skinValue, base.settings.skinValue),
      ctpValue: num(r.settings?.ctpValue, base.settings.ctpValue),
      carryover: typeof r.settings?.carryover === "boolean" ? r.settings.carryover : true,
      ctpCarryover: typeof r.settings?.ctpCarryover === "boolean" ? r.settings.ctpCarryover : false,
      startOnBack9: r.settings?.startOnBack9 === true,
    },
    holeHandicaps: Array.from({ length: HOLES }, (_, i) => numOrNull(hh[i])),
    scores,
    course:
      r.course && typeof r.course.id === "string" && typeof r.course.name === "string"
        ? { id: r.course.id, name: r.course.name }
        : null,
    ctps: Array.isArray(r.ctps)
      ? r.ctps.map((c) => ({
          id: typeof c?.id === "string" ? c.id : newId(),
          hole: num(c?.hole, 1),
          winnerId: typeof c?.winnerId === "string" ? c.winnerId : null,
          noWinner: c?.noWinner === true,
          notes: typeof c?.notes === "string" ? c.notes : "",
        }))
      : [],
  };
}

export function loadRound(): Round | null {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

export function saveRound(round: Round): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(round));
  } catch {
    // Private browsing / quota exceeded: keep working in memory.
  }
}

export function clearRound(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
