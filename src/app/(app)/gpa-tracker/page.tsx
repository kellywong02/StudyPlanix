import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { resolveGradingScale, type GradePoint } from "@/lib/grading-scales"
import { computeGpaSummary, pointsForGrade, type GradedCourse } from "@/lib/gpa"
import { Card, CardContent } from "@/components/ui/card"

import { GpaGrowthChart } from "./gpa-growth-chart"

export default async function GpaTrackerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: courses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("grading_scale_id, custom_grade_scale")
      .eq("id", user!.id)
      .single(),
    supabase.from("courses").select("id, name, term, credits, grade").order("created_at"),
  ])

  const scale = resolveGradingScale(
    profile?.grading_scale_id ?? "us-standard",
    (profile?.custom_grade_scale as GradePoint[] | null) ?? null
  )

  const gradedCourses: GradedCourse[] = (courses ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    term: c.term,
    credits: c.credits,
    grade: c.grade,
  }))

  const summary = computeGpaSummary(gradedCourses, scale)

  const coursesByTerm = new Map<string, typeof courses>()
  for (const c of courses ?? []) {
    if (!c.grade || !c.credits) continue
    const term = c.term?.trim() || "No term"
    const list = coursesByTerm.get(term) ?? []
    list.push(c)
    coursesByTerm.set(term, list)
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">GPA Tracker</h1>
        <Link href="/settings" className="text-sm text-muted-foreground underline underline-offset-4">
          {scale.label} · Change scale
        </Link>
      </div>

      <Card className="max-w-sm">
        <CardContent className="grid gap-1 py-6 text-center">
          <p className="text-sm text-muted-foreground">Cumulative GPA</p>
          <p className="text-5xl font-semibold tabular-nums">
            {summary.cumulativeGpa !== null ? summary.cumulativeGpa.toFixed(2) : "—"}
            <span className="text-lg text-muted-foreground"> / {scale.maxPoints.toFixed(1)}</span>
          </p>
          <p className="text-xs text-muted-foreground">{summary.totalCredits} credits completed</p>
        </CardContent>
      </Card>

      {summary.terms.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No graded courses yet.{" "}
            <Link href="/courses" className="underline underline-offset-4">
              Add a final grade and credit hours
            </Link>{" "}
            to a course to see your GPA here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardContent className="py-4">
              <GpaGrowthChart
                points={summary.terms.map((t) => ({
                  term: t.term,
                  cumulativeGpa: t.cumulativeGpaThroughTerm ?? 0,
                }))}
                maxPoints={scale.maxPoints}
              />
            </CardContent>
          </Card>

          {summary.terms.map((termSummary) => (
            <div key={termSummary.term} className="grid gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">{termSummary.term}</h2>
                <p className="text-sm font-medium">
                  {termSummary.gpa !== null ? termSummary.gpa.toFixed(2) : "—"} GPA ·{" "}
                  {termSummary.credits} credits
                </p>
              </div>
              <Card>
                <CardContent className="grid gap-2 py-4">
                  {(coursesByTerm.get(termSummary.term) ?? []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">
                        {c.grade} ({pointsForGrade(scale, c.grade!)?.toFixed(2)}) · {c.credits}{" "}
                        credits
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
