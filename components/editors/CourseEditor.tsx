"use client";

import { useEffect, useState } from "react";
import { exportCourses, findByName, importCourses, loadCourses, sameHandicaps, saveCourses, sortCourses, type Course } from "@/lib/courses";
import { DEFAULT_HOLE_HANDICAPS, duplicateHandicaps, type Round } from "@/lib/scoring";
import { newId } from "@/lib/storage";
import type { UpdateRound } from "../SkinsApp";
import { Button, NumberInput } from "../ui";

const validHcp = (h: number | null) => h == null || (Number.isInteger(h) && h >= 1 && h <= 18);

export default function CourseEditor({ round, update, hasScores }: { round: Round; update: UpdateRound; hasScores: boolean }) {
  // Only rendered after the app has hydrated, so localStorage is available here.
  const [courses, setCourses] = useState<Course[]>(() => loadCourses(newId));
  const [message, setMessage] = useState<string | null>(null);
  const [importText, setImportText] = useState("");

  useEffect(() => saveCourses(courses), [courses]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 3000);
  };

  const selected = courses.find((c) => c.id === round.course?.id) ?? null;
  const modified = selected != null && !sameHandicaps(selected.holeHandicaps, round.holeHandicaps);
  const dupes = duplicateHandicaps(round.holeHandicaps);
  const missingHcp = round.holeHandicaps.filter((h) => h == null).length;

  const applyCourse = (c: Course | null) =>
    update((d) => {
      d.course = c ? { id: c.id, name: c.name } : null;
      if (c) d.holeHandicaps = [...c.holeHandicaps];
    });

  const pick = (id: string) => {
    const c = courses.find((x) => x.id === id) ?? null;
    if (c && hasScores && !sameHandicaps(c.holeHandicaps, round.holeHandicaps)) {
      if (!window.confirm(`Load ${c.name}? Strokes on holes already scored will be recalculated with its handicaps.`)) return;
    }
    applyCourse(c);
  };

  const saveAsNew = () => {
    const name = window.prompt("Course name (e.g. “Pine Valley – Blue tees”):", "")?.trim();
    if (!name) return;
    const existing = findByName(courses, name);
    if (existing) {
      if (!window.confirm(`“${existing.name}” already exists. Replace its handicaps with these?`)) return;
      const replaced = { ...existing, holeHandicaps: [...round.holeHandicaps], updatedAt: Date.now() };
      setCourses((cs) => cs.map((c) => (c.id === existing.id ? replaced : c)));
      applyCourse(replaced);
      flash(`Updated ${existing.name}`);
      return;
    }
    const c: Course = { id: newId(), name, holeHandicaps: [...round.holeHandicaps], updatedAt: Date.now() };
    setCourses((cs) => [...cs, c]);
    applyCourse(c);
    flash(`Saved ${name}`);
  };

  const updateSelected = () => {
    if (!selected) return;
    setCourses((cs) => cs.map((c) => (c.id === selected.id ? { ...c, holeHandicaps: [...round.holeHandicaps], updatedAt: Date.now() } : c)));
    flash(`Updated ${selected.name}`);
  };

  const renameSelected = () => {
    if (!selected) return;
    const name = window.prompt("Rename course:", selected.name)?.trim();
    if (!name || name === selected.name) return;
    const clash = findByName(courses, name);
    if (clash && clash.id !== selected.id) {
      window.alert(`There’s already a course called “${clash.name}”.`);
      return;
    }
    setCourses((cs) => cs.map((c) => (c.id === selected.id ? { ...c, name, updatedAt: Date.now() } : c)));
    update((d) => void (d.course = { id: selected.id, name }));
  };

  const deleteSelected = () => {
    if (!selected || !window.confirm(`Delete ${selected.name} from saved courses? The current round keeps its handicaps.`)) return;
    setCourses((cs) => cs.filter((c) => c.id !== selected.id));
    update((d) => void (d.course = null));
    flash(`Deleted ${selected.name}`);
  };

  const doExport = async () => {
    const text = exportCourses(courses);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Skins Tracker courses", text });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      flash(`Copied ${courses.length} course${courses.length === 1 ? "" : "s"} — paste into Import on the other phone`);
    } catch {
      window.prompt("Copy this text:", text);
    }
  };

  const doImport = () => {
    try {
      const { courses: merged, added, updated } = importCourses(importText, courses, newId);
      setCourses(merged);
      setImportText("");
      flash(added + updated === 0 ? "Those courses are already saved" : `Imported: ${added} new, ${updated} updated`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Import failed");
    }
  };

  return (
    <div>
      <label className="eyebrow block" htmlFor="course-select">
        Saved course
      </label>
      <select
        id="course-select"
        value={selected?.id ?? ""}
        onChange={(e) => pick(e.target.value)}
        className="mt-1 h-12 w-full rounded-md border border-rule bg-paper px-2 font-serif text-lg outline-none focus:border-green"
      >
        <option value="">{courses.length ? "— Not saved —" : "— No saved courses yet —"}</option>
        {sortCourses(courses).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {modified && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-warn-soft p-2">
          <span className="text-sm font-semibold text-warn">Handicaps differ from the saved course</span>
          <Button variant="primary" className="min-h-10 shrink-0 px-3 text-sm" onClick={updateSelected}>
            Update
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant={selected ? "secondary" : "primary"} className="px-3 text-sm" onClick={saveAsNew}>
          Save as new course
        </Button>
        {selected && (
          <>
            <Button className="px-3 text-sm" onClick={renameSelected}>
              Rename
            </Button>
            <Button variant="danger" className="px-3 text-sm" onClick={deleteSelected}>
              Delete
            </Button>
          </>
        )}
      </div>

      {message && (
        <p role="status" className="mt-2 text-sm font-semibold text-good">
          {message}
        </p>
      )}

      <div className="mb-2 mt-5 flex items-center justify-between gap-2">
        <h3 className="eyebrow">Hole handicaps · 1 = hardest</h3>
        <Button variant="ghost" className="min-h-10 px-2 text-sm text-green" onClick={() => update((d) => void (d.holeHandicaps = [...DEFAULT_HOLE_HANDICAPS]))}>
          Default
        </Button>
      </div>
      {/* Laid out like the handicap row of a printed card: Out and In. */}
      {[0, 9].map((start) => (
        <div key={start} className="mb-2 overflow-hidden rounded-md border border-rule">
          <div className="grid grid-cols-9 bg-paper-2 text-center text-[11px] font-bold text-muted">
            {round.holeHandicaps.slice(start, start + 9).map((_, j) => (
              <div key={j} className="border-r border-rule/70 py-1 last:border-r-0">
                {start + j + 1}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-9">
            {round.holeHandicaps.slice(start, start + 9).map((h, j) => {
              const i = start + j;
              const bad = !validHcp(h) || (h != null && dupes.has(h));
              return (
                <NumberInput
                  key={i}
                  aria-label={`Handicap for hole ${i + 1}`}
                  value={h}
                  invalid={bad}
                  onChange={(v) => update((d) => void (d.holeHandicaps[i] = v))}
                  className="h-11 w-full rounded-none border-0 border-r border-rule/70 font-serif text-lg last:border-r-0"
                />
              );
            })}
          </div>
        </div>
      ))}
      {dupes.size > 0 && (
        <p className="mt-2 rounded-md bg-warn-soft p-2 text-sm font-semibold text-warn">
          Duplicate handicap{dupes.size > 1 ? "s" : ""}: {[...dupes].sort((a, b) => a - b).join(", ")}
        </p>
      )}
      {missingHcp > 0 && (
        <p className="mt-2 text-sm text-warn">
          {missingHcp} hole{missingHcp > 1 ? "s have" : " has"} no handicap — no strokes are given there.
        </p>
      )}

      <details className="mt-5 border-t border-rule pt-3">
        <summary className="min-h-10 cursor-pointer font-semibold">Move courses to another phone</summary>
        <p className="mt-1 text-sm text-muted">Courses are saved on this phone only. Export copies them as text; paste that into Import on the other phone.</p>
        <Button className="mt-3 w-full" onClick={doExport} disabled={courses.length === 0}>
          Export {courses.length} course{courses.length === 1 ? "" : "s"}
        </Button>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste exported courses here"
          aria-label="Paste exported courses"
          rows={3}
          className="mt-3 w-full rounded-md border border-rule bg-paper p-2 text-sm outline-none focus:border-green"
        />
        <Button className="mt-2 w-full" onClick={doImport} disabled={importText.trim() === ""}>
          Import
        </Button>
      </details>
    </div>
  );
}
