import { describe, expect, it } from "vitest"

import { computeGpaSummary, pointsForGrade, type GradedCourse } from "./gpa"
import { PRESET_GRADING_SCALES, resolveGradingScale } from "./grading-scales"

const us4 = PRESET_GRADING_SCALES.find((s) => s.id === "us-standard")!

describe("pointsForGrade", () => {
  it("resolves a known grade to its points", () => {
    expect(pointsForGrade(us4, "A")).toBe(4.0)
    expect(pointsForGrade(us4, "B-")).toBe(2.7)
  })

  it("returns null for an unknown grade", () => {
    expect(pointsForGrade(us4, "Z")).toBeNull()
  })
})

describe("computeGpaSummary", () => {
  it("computes a simple cumulative GPA across two equally-weighted courses", () => {
    const courses: GradedCourse[] = [
      { id: "1", name: "Algorithms", term: "Fall 2026", credits: 4, grade: "A" }, // 4.0
      { id: "2", name: "Databases", term: "Fall 2026", credits: 4, grade: "B" }, // 3.0
    ]
    const summary = computeGpaSummary(courses, us4)
    expect(summary.totalCredits).toBe(8)
    expect(summary.cumulativeGpa).toBeCloseTo(3.5)
  })

  it("weights GPA by credit hours, not a plain average", () => {
    const courses: GradedCourse[] = [
      { id: "1", name: "Big course", term: "Fall 2026", credits: 5, grade: "A" }, // 4.0 * 5 = 20
      { id: "2", name: "Small course", term: "Fall 2026", credits: 1, grade: "D" }, // 1.0 * 1 = 1
    ]
    const summary = computeGpaSummary(courses, us4)
    // (20 + 1) / 6 = 3.5, NOT the plain average of 4.0 and 1.0 (2.5)
    expect(summary.cumulativeGpa).toBeCloseTo(3.5)
  })

  it("groups GPA per term as well as cumulative", () => {
    const courses: GradedCourse[] = [
      { id: "1", name: "Course 1", term: "Fall 2026", credits: 3, grade: "A" },
      { id: "2", name: "Course 2", term: "Spring 2027", credits: 3, grade: "C" },
    ]
    const summary = computeGpaSummary(courses, us4)
    expect(summary.terms).toHaveLength(2)
    expect(summary.terms.find((t) => t.term === "Fall 2026")?.gpa).toBeCloseTo(4.0)
    expect(summary.terms.find((t) => t.term === "Spring 2027")?.gpa).toBeCloseTo(2.0)
  })

  it("excludes courses with no grade or no credits from the calculation", () => {
    const courses: GradedCourse[] = [
      { id: "1", name: "Graded", term: "Fall 2026", credits: 3, grade: "A" },
      { id: "2", name: "In progress", term: "Fall 2026", credits: 3, grade: null },
      { id: "3", name: "No credits set", term: "Fall 2026", credits: null, grade: "B" },
    ]
    const summary = computeGpaSummary(courses, us4)
    expect(summary.totalCredits).toBe(3)
    expect(summary.cumulativeGpa).toBeCloseTo(4.0)
  })

  it("returns null cumulative GPA when there are no graded courses", () => {
    const summary = computeGpaSummary([], us4)
    expect(summary.cumulativeGpa).toBeNull()
    expect(summary.totalCredits).toBe(0)
    expect(summary.terms).toHaveLength(0)
  })

  it("tracks a running cumulative GPA through each term, for the growth chart", () => {
    const courses: GradedCourse[] = [
      // term 1: straight A's, 4 credits -> cumulative 4.0
      { id: "1", name: "Course 1", term: "Fall 2026", credits: 4, grade: "A" },
      // term 2: a rough term (D, 4 credits) pulls the running cumulative down,
      // but the term's OWN gpa should show the dip in isolation
      { id: "2", name: "Course 2", term: "Spring 2027", credits: 4, grade: "D" },
    ]
    const summary = computeGpaSummary(courses, us4)
    const fall = summary.terms.find((t) => t.term === "Fall 2026")!
    const spring = summary.terms.find((t) => t.term === "Spring 2027")!

    expect(fall.gpa).toBeCloseTo(4.0)
    expect(fall.cumulativeGpaThroughTerm).toBeCloseTo(4.0)

    expect(spring.gpa).toBeCloseTo(1.0) // this term alone was rough
    // but the running cumulative through spring blends both terms:
    // (4.0*4 + 1.0*4) / 8 = 2.5
    expect(spring.cumulativeGpaThroughTerm).toBeCloseTo(2.5)
  })
})

describe("resolveGradingScale", () => {
  it("resolves a preset scale by id", () => {
    const scale = resolveGradingScale("nus", null)
    expect(scale.id).toBe("nus")
    expect(scale.maxPoints).toBe(5.0)
  })

  it("gives SMU a 4.0 max even though it's a Singapore university (unlike NUS/NTU at 5.0)", () => {
    const smu = resolveGradingScale("smu", null)
    expect(smu.maxPoints).toBe(4.0)
    const nus = resolveGradingScale("nus", null)
    expect(nus.maxPoints).toBe(5.0)
  })

  it("falls back to the US standard preset for an unknown id", () => {
    const scale = resolveGradingScale("nonexistent", null)
    expect(scale.id).toBe("us-standard")
  })

  it("builds a custom scale from the stored grade/points list", () => {
    const scale = resolveGradingScale("custom", [
      { grade: "Distinction", points: 4.5 },
      { grade: "Pass", points: 2.0 },
    ])
    expect(scale.id).toBe("custom")
    expect(scale.maxPoints).toBe(4.5)
    expect(pointsForGrade(scale, "Distinction")).toBe(4.5)
  })
})
