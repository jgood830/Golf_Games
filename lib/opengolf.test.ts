import { describe, expect, it } from "vitest";
import { courseLabel, parseCourse, parseSearch } from "./opengolf";

// Shapes match api.opengolfapi.org: search returns { count, courses: [golf_courses rows] },
// course detail returns the row plus scorecard: [{ hole_number, par, handicap_index }].
const PARS = [4, 5, 4, 4, 3, 5, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 5];
const HCPS = [7, 11, 15, 1, 3, 17, 13, 5, 9, 8, 16, 2, 12, 4, 18, 10, 6, 14];

describe("OpenGolfAPI parsing", () => {
  it("parses search results and skips rows without an id", () => {
    const results = parseSearch({
      count: 3,
      courses: [
        { id: "40977ee8", course_name: "Pebble Beach Golf Links", city: "Pebble Beach", state: "CA", holes: 18, par: 72 },
        { id: "abc", course_name: "  Spyglass Hill  ", state: "CA", holes: "18" },
        { course_name: "No id" },
      ],
    });
    expect(results).toEqual([
      { id: "40977ee8", name: "Pebble Beach Golf Links", city: "Pebble Beach", state: "CA", holes: 18, par: 72 },
      { id: "abc", name: "Spyglass Hill", city: "", state: "CA", holes: 18, par: null },
    ]);
    expect(parseSearch({ error: "boom" })).toEqual([]);
  });

  it("maps the scorecard onto handicaps and pars by hole number", () => {
    const scorecard = PARS.map((par, i) => ({ hole_number: i + 1, par, handicap_index: HCPS[i] })).reverse();
    const course = parseCourse({ id: "40977ee8", course_name: "Pebble Beach Golf Links", city: "Pebble Beach", state: "CA", scorecard });
    expect(course.holeHandicaps).toEqual(HCPS);
    expect(course.holePars).toEqual(PARS);
    expect(course.missingHandicaps).toBe(0);
    expect(courseLabel(course)).toBe("Pebble Beach Golf Links (Pebble Beach, CA)");
  });

  it("handles 9-hole courses, gaps, junk values and extra holes", () => {
    const course = parseCourse({
      id: "x",
      name: "Nine Holer",
      scorecard: [
        { hole_number: 1, par: 4, handicap_index: 1 },
        { hole_number: 2, par: 3, handicap_index: null },
        { hole_number: 2, par: 5, handicap_index: 9 }, // duplicate hole: first wins
        { hole_number: 3, par: 12, handicap_index: 40 }, // out of range → null
        { hole_number: 19, par: 4, handicap_index: 1 }, // beyond 18 → ignored
      ],
    });
    expect(course.holeHandicaps.slice(0, 4)).toEqual([1, null, null, null]);
    expect(course.holePars.slice(0, 4)).toEqual([4, 3, null, null]);
    expect(course.missingHandicaps).toBe(17);
    expect(course.scorecardHoles).toBe(5);
    expect(courseLabel(course)).toBe("Nine Holer");
  });

  it("rejects non-object responses", () => {
    expect(() => parseCourse(null)).toThrow();
  });
});
