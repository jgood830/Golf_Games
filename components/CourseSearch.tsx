"use client";

import { useRef, useState } from "react";
import { OPENGOLF_ATTRIBUTION, fetchCourse, searchCourses, type OpenGolfCourse, type OpenGolfSearchResult } from "@/lib/opengolf";
import { Button, cx } from "./ui";

const inputClass = "h-12 rounded-lg border-2 border-line bg-surface px-3 text-lg outline-none focus:border-accent";

/** Search OpenGolfAPI by course name and hand the chosen course's scorecard to onPick. */
export default function CourseSearch({ onPick }: { onPick: (course: OpenGolfCourse) => void }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [results, setResults] = useState<OpenGolfSearchResult[] | null>(null);
  const [busy, setBusy] = useState<"search" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = async <T,>(key: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(key);
    setError(null);
    try {
      return await fn(ctrl.signal);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (abort.current === ctrl) setBusy(null);
    }
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim().length < 2) {
      setError("Type at least 2 letters of the course name.");
      return;
    }
    const found = await run("search", (signal) => searchCourses(query, state, signal));
    if (found) setResults(found);
  };

  const pick = async (r: OpenGolfSearchResult) => {
    const course = await run(r.id, (signal) => fetchCourse(r.id, signal));
    if (!course) return;
    if (course.missingHandicaps === 18) {
      setError(`OpenGolfAPI has no hole handicaps for ${r.name} yet. Enter them below and tap “Save as new course”.`);
      return;
    }
    // Fill in place details the detail call may lack.
    onPick({ ...course, name: course.name || r.name, city: course.city || r.city, state: course.state || r.state });
    setResults(null);
    setQuery("");
  };

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <form onSubmit={search} className="space-y-2" role="search">
        <label className="block text-xs font-bold text-muted" htmlFor="course-query">
          Find a course on OpenGolfAPI
        </label>
        <div className="flex gap-2">
          <input
            id="course-query"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Course name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cx(inputClass, "min-w-0 flex-1")}
          />
          <input
            aria-label="State (optional, e.g. CA)"
            placeholder="ST"
            maxLength={2}
            autoCapitalize="characters"
            autoComplete="off"
            value={state}
            onChange={(e) => setState(e.target.value.replace(/[^a-z]/gi, "").toUpperCase())}
            className={cx(inputClass, "w-16 text-center uppercase")}
          />
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={busy === "search"}>
          {busy === "search" ? "Searching…" : "Search"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-warn">
          {error}
        </p>
      )}

      {results && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted">No courses found. Try fewer words or drop the state.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto" aria-label="Search results">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    disabled={busy != null}
                    className="flex min-h-14 w-full items-center justify-between gap-2 rounded-lg border-2 border-line bg-surface px-3 py-2 text-left disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.name}</span>
                      <span className="block text-sm text-muted">
                        {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                        {r.holes ? ` · ${r.holes} holes` : ""}
                        {r.par ? ` · par ${r.par}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-accent">{busy === r.id ? "Loading…" : "Use"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-2 text-[11px] text-muted">
        {OPENGOLF_ATTRIBUTION}. Needs signal; saved courses work offline.
      </p>
    </div>
  );
}
