import { HOLES } from "./scoring";

/** A saved course. Kept separate from the round so resets don't erase it. */
export interface Course {
  id: string;
  name: string;
  /** Hole handicap per hole (0-based index). null = not entered. */
  holeHandicaps: (number | null)[];
  /** Par per hole (0-based index), if known. */
  holePars?: (number | null)[];
  /** Where the course data came from, for re-syncing and attribution. */
  source?: { provider: "opengolfapi"; id: string };
  updatedAt: number;
}

const STORAGE_KEY = "skins-tracker:courses";
const EXPORT_APP = "skins-tracker";
const EXPORT_VERSION = 1;

const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function sortCourses(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function sameHandicaps(a: (number | null)[], b: (number | null)[]): boolean {
  for (let i = 0; i < HOLES; i++) if ((a[i] ?? null) !== (b[i] ?? null)) return false;
  return true;
}

export function findBySource(courses: Course[], provider: string, id: string): Course | undefined {
  return courses.find((c) => c.source?.provider === provider && c.source.id === id);
}

const parsOf = (v: unknown): (number | null)[] | undefined =>
  Array.isArray(v) ? Array.from({ length: HOLES }, (_, i) => numOrNull(v[i])) : undefined;

const sourceOf = (v: unknown): Course["source"] => {
  const s = v as { provider?: unknown; id?: unknown } | null;
  return s && s.provider === "opengolfapi" && typeof s.id === "string" && s.id ? { provider: "opengolfapi", id: s.id } : undefined;
};

export function findByName(courses: Course[], name: string): Course | undefined {
  return courses.find((c) => sameName(c.name, name));
}

/** Coerce stored or imported data into valid courses, dropping anything unusable. */
export function sanitizeCourses(raw: unknown, makeId: () => string): Course[] {
  if (!Array.isArray(raw)) return [];
  const out: Course[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const r = c as Partial<Course>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name || !Array.isArray(r.holeHandicaps)) continue;
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : makeId(),
      name,
      holeHandicaps: Array.from({ length: HOLES }, (_, i) => numOrNull(r.holeHandicaps![i])),
      ...(parsOf(r.holePars) && { holePars: parsOf(r.holePars) }),
      ...(sourceOf(r.source) && { source: sourceOf(r.source) }),
      updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
    });
  }
  return out;
}

export function exportCourses(courses: Course[]): string {
  return JSON.stringify({
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    courses: sortCourses(courses).map(({ name, holeHandicaps, holePars, source }) => ({ name, holeHandicaps, holePars, source })),
  });
}

/**
 * Merge exported text into the existing list. A course whose name matches an
 * existing one (ignoring case) replaces its handicaps; others are added.
 * Throws an Error with a readable message if the text isn't a course export.
 */
export function importCourses(
  text: string,
  existing: Course[],
  makeId: () => string,
  now = Date.now(),
): { courses: Course[]; added: number; updated: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    throw new Error("That doesn’t look like a course export.");
  }
  const list = Array.isArray(parsed) ? parsed : (parsed as { courses?: unknown } | null)?.courses;
  const incoming = sanitizeCourses(list, makeId);
  if (incoming.length === 0) throw new Error("No courses found in that text.");

  const courses = [...existing];
  let added = 0;
  let updated = 0;
  for (const c of incoming) {
    const i = courses.findIndex((x) => sameName(x.name, c.name));
    if (i >= 0) {
      const parsChanged = c.holePars != null && !sameHandicaps(courses[i].holePars ?? [], c.holePars);
      if (!sameHandicaps(courses[i].holeHandicaps, c.holeHandicaps) || parsChanged) {
        courses[i] = { ...courses[i], holeHandicaps: c.holeHandicaps, ...(c.holePars && { holePars: c.holePars }), updatedAt: now };
        updated++;
      }
    } else {
      courses.push({ ...c, id: makeId(), updatedAt: now });
      added++;
    }
  }
  return { courses, added, updated };
}

export function loadCourses(makeId: () => string): Course[] {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? sanitizeCourses(JSON.parse(text), makeId) : [];
  } catch {
    return [];
  }
}

export function saveCourses(courses: Course[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  } catch {
    // Private browsing / quota exceeded: keep working in memory.
  }
}
