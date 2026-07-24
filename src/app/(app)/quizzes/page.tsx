import { createClient } from "@/lib/supabase/server"

import { QuizzesWorkspace } from "./quizzes-workspace"

export default async function QuizzesPage() {
  const supabase = await createClient()

  const [{ data: quizzes }, { data: courses }] = await Promise.all([
    supabase
      .from("quizzes")
      .select("*, courses(name, color), quiz_questions(count), quiz_attempts(score, total_questions)")
      .order("created_at", { ascending: false }),
    supabase.from("courses").select("id, name, color").eq("archived", false).order("name"),
  ])

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Quizzes</h1>
      <QuizzesWorkspace quizzes={quizzes ?? []} courses={courses ?? []} />
    </div>
  )
}
