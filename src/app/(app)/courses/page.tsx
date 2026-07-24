import { createClient } from "@/lib/supabase/server"
import { resolveGradingScale, type GradePoint } from "@/lib/grading-scales"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { CopyEmailButton } from "./copy-email-button"
import { CourseDialog } from "./course-dialog"
import { DeleteCourseButton } from "./delete-course-button"

export default async function CoursesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [{ data: courses }, { data: profile }] = await Promise.all([
    supabase
      .from("courses")
      .select("*, course_groups(*)")
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("grading_scale_id, custom_grade_scale")
      .eq("id", user!.id)
      .single(),
  ])

  const scale = resolveGradingScale(
    profile?.grading_scale_id ?? "us-standard",
    (profile?.custom_grade_scale as GradePoint[] | null) ?? null
  )
  const gradeOptions = scale.grades.map((g) => g.grade)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <CourseDialog trigger={<Button>New course</Button>} gradeOptions={gradeOptions} />
      </div>

      {!courses?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No courses yet. Add your first course to start building your timetable.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: course.color ?? "#3b82f6" }}
                  />
                  <div>
                    <CardTitle className="text-base">{course.name}</CardTitle>
                    {course.code && (
                      <p className="text-sm text-muted-foreground">{course.code}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm text-muted-foreground">
                {course.location && <p>Location: {course.location}</p>}
                {course.term && <p>Term: {course.term}</p>}
                {(course.credits || course.grade) && (
                  <p>
                    {course.grade ? `Grade: ${course.grade}` : "Not graded yet"}
                    {course.credits ? ` · ${course.credits} credits` : ""}
                  </p>
                )}
                {course.course_groups.length > 0 && (
                  <div>
                    <p>Groups:</p>
                    <ul className="ml-4 list-disc">
                      {course.course_groups.map((g) => (
                        <li key={g.id} className="flex items-center gap-1">
                          <span>
                            {g.name}
                            {g.instructor ? ` — ${g.instructor}` : ""}
                          </span>
                          {g.instructor_email && (
                            <CopyEmailButton
                              email={g.instructor_email}
                              label={g.instructor || g.name}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <CourseDialog
                    course={course}
                    gradeOptions={gradeOptions}
                    trigger={
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <DeleteCourseButton courseId={course.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
