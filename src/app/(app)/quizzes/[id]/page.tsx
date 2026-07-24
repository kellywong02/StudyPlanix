import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import { QuizTaker } from "./quiz-taker"

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: quiz }, { data: questions }, { data: attempts }] = await Promise.all([
    supabase.from("quizzes").select("*, courses(name, color)").eq("id", id).single(),
    supabase.from("quiz_questions").select("*").eq("quiz_id", id).order("order_index"),
    supabase
      .from("quiz_attempts")
      .select("score, total_questions, completed_at")
      .eq("quiz_id", id)
      .order("completed_at", { ascending: false }),
  ])

  if (!quiz || !questions || questions.length === 0) {
    notFound()
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{quiz.title}</h1>
        {quiz.courses && (
          <p className="text-sm text-muted-foreground">{quiz.courses.name}</p>
        )}
      </div>
      <QuizTaker quizId={id} questions={questions} pastAttempts={attempts ?? []} />
    </div>
  )
}
