/**
 * Client for OpenGolfAPI (https://opengolfapi.org), an open, ODbL-licensed
 * golf course database. Reads need no API key (1,000 requests/day per IP) and
 * the API allows browser requests from any origin.
 */
import { HOLES } from "./scoring";

export const OPENGOLF_BASE = "https://api.opengolfapi.org";
export const OPENGOLF_ATTRIBUTION = "Contains data from OpenGolfAPI (opengolfapi.org), ODbL";

export interface OpenGolfSearchResult {
  id: string;
  name: string;
  city: string;
  state: string;
  holes: number | null;
  par: number | null;
}

export interface OpenGolfCourse {
  id: string;
  name: string;
  city: string;
  state: string;
  holeHandicaps: (number | null)[];
  holePars: (number | null)[];
  /** Holes in the API scorecard (may be 9, 18 or more for big facilities). */
  scorecardHoles: number;
  /** Holes 1–18 with no handicap index in the data. */
  missingHandicaps: number;
}

type Json = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const int = (v: unknown): number | null => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) ? n : null;
};

function courseName(row: Json): string {
  return str(row.course_name) || str(row.name) || str(row.club_name) || "Unnamed course";
}

/** Readable label used when saving, e.g. "Pebble Beach Golf Links (Pebble Beach, CA)". */
export function courseLabel(c: { name: string; city: string; state: string }): string {
  const place = [c.city, c.state].filter(Boolean).join(", ");
  return place ? `${c.name} (${place})` : c.name;
}

export function parseSearch(json: unknown): OpenGolfSearchResult[] {
  const rows = (json as { courses?: unknown } | null)?.courses;
  if (!Array.isArray(rows)) return [];
  const out: OpenGolfSearchResult[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const row = r as Json;
    const id = str(row.id) || (typeof row.id === "number" ? String(row.id) : "");
    if (!id) continue;
    out.push({
      id,
      name: courseName(row),
      city: str(row.city),
      state: str(row.state),
      holes: int(row.holes),
      par: int(row.par),
    });
  }
  return out;
}

export function parseCourse(json: unknown): OpenGolfCourse {
  if (!json || typeof json !== "object") throw new Error("Unexpected response from OpenGolfAPI.");
  const row = json as Json;
  const scorecard = Array.isArray(row.scorecard) ? (row.scorecard as unknown[]) : [];
  const holeHandicaps: (number | null)[] = Array(HOLES).fill(null);
  const holePars: (number | null)[] = Array(HOLES).fill(null);
  const seen = new Set<number>();

  for (const h of scorecard) {
    if (!h || typeof h !== "object") continue;
    const hole = int((h as Json).hole_number ?? (h as Json).hole);
    if (hole == null || hole < 1 || hole > HOLES || seen.has(hole)) continue;
    seen.add(hole);
    const hcp = int((h as Json).handicap_index ?? (h as Json).handicap);
    const par = int((h as Json).par);
    holeHandicaps[hole - 1] = hcp != null && hcp >= 1 && hcp <= HOLES ? hcp : null;
    holePars[hole - 1] = par != null && par >= 3 && par <= 6 ? par : null;
  }

  return {
    id: str(row.id) || String(row.id ?? ""),
    name: courseName(row),
    city: str(row.city),
    state: str(row.state),
    holeHandicaps,
    holePars,
    scorecardHoles: scorecard.length,
    missingHandicaps: holeHandicaps.filter((h) => h == null).length,
  };
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${OPENGOLF_BASE}${path}`, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error("Couldn’t reach OpenGolfAPI. Check your signal and try again.");
  }
  if (res.status === 429) throw new Error("OpenGolfAPI’s daily lookup limit was reached. Try again tomorrow.");
  if (res.status === 404) throw new Error("That course wasn’t found on OpenGolfAPI.");
  if (!res.ok) throw new Error(`OpenGolfAPI error (${res.status}). Try again later.`);
  return res.json();
}

export async function searchCourses(query: string, state = "", signal?: AbortSignal): Promise<OpenGolfSearchResult[]> {
  const params = new URLSearchParams({ q: query.trim(), limit: "25" });
  if (state.trim()) params.set("state", state.trim().toUpperCase());
  return parseSearch(await getJson(`/v1/courses/search?${params}`, signal));
}

export async function fetchCourse(id: string, signal?: AbortSignal): Promise<OpenGolfCourse> {
  return parseCourse(await getJson(`/v1/courses/${encodeURIComponent(id)}`, signal));
}
