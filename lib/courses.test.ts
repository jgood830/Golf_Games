import { describe, expect, it } from "vitest";
import { exportCourses, importCourses, sameHandicaps, sanitizeCourses, sortCourses, type Course } from "./courses";
import { DEFAULT_HOLE_HANDICAPS } from "./scoring";

let n = 0;
const makeId = () => `id${++n}`;
const hcps = (first: number) => [first, ...DEFAULT_HOLE_HANDICAPS.slice(1)];
const course = (name: string, first = 7): Course => ({ id: makeId(), name, holeHandicaps: hcps(first), updatedAt: 1 });

describe("courses", () => {
  it("round-trips through export and import", () => {
    const original = [course("Pine Valley"), course("Augusta", 3)];
    const { courses, added, updated } = importCourses(exportCourses(original), [], makeId, 99);
    expect(added).toBe(2);
    expect(updated).toBe(0);
    expect(sortCourses(courses).map((c) => [c.name, c.holeHandicaps[0]])).toEqual([
      ["Augusta", 3],
      ["Pine Valley", 7],
    ]);
  });

  it("merges by name ignoring case, updating only changed handicaps", () => {
    const existing = [course("Pine Valley"), course("Augusta")];
    const text = exportCourses([course("pine valley", 1), course("AUGUSTA"), course("Pebble")]);
    const { courses, added, updated } = importCourses(text, existing, makeId, 99);
    expect(added).toBe(1);
    expect(updated).toBe(1);
    expect(courses).toHaveLength(3);
    const pine = courses.find((c) => c.id === existing[0].id)!;
    expect(pine.name).toBe("Pine Valley");
    expect(pine.holeHandicaps[0]).toBe(1);
    expect(pine.updatedAt).toBe(99);
    expect(courses.find((c) => c.id === existing[1].id)!.updatedAt).toBe(1);
  });

  it("accepts a bare array and rejects junk", () => {
    expect(importCourses(JSON.stringify([{ name: "A", holeHandicaps: [1, 2] }]), [], makeId).added).toBe(1);
    expect(() => importCourses("not json", [], makeId)).toThrow(/course export/);
    expect(() => importCourses('{"courses": []}', [], makeId)).toThrow(/No courses/);
  });

  it("sanitizes stored data", () => {
    const out = sanitizeCourses(
      [{ name: "  Ok  ", holeHandicaps: [1, "x", null] }, { name: "", holeHandicaps: [] }, { name: "No hcps" }, 5, null],
      makeId,
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Ok");
    expect(out[0].holeHandicaps).toHaveLength(18);
    expect(out[0].holeHandicaps.slice(0, 3)).toEqual([1, null, null]);
    expect(sanitizeCourses("nope", makeId)).toEqual([]);
  });

  it("compares handicaps", () => {
    expect(sameHandicaps(hcps(7), [...DEFAULT_HOLE_HANDICAPS])).toBe(true);
    expect(sameHandicaps(hcps(1), [...DEFAULT_HOLE_HANDICAPS])).toBe(false);
  });
});
