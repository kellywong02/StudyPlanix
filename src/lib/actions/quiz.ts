"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { gradeShortAnswers } from "@/lib/ai/grade-short-answers"

export type QuestionResult = {
  questionId: string
  isCorrect: boolean
  correctAnswer: string
  explanation: string | null
  feedback: string | null
}

export type SubmitQuizAttemptResult = {
  error?: string
  score?: number
  totalQuestions?: number
  results?: QuestionResult[]
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, string>
): Promise<SubmitQuizAttemptResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: questions, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index")

  if (error || !questions || questions.length === 0) {
    return { error: "Quiz not found" }
  }

  const shortAnswerItems = questions
    .filter((q) => q.question_type === "short_answer")
    .map((q) => ({
      questionId: q.id,
      questionText: q.question_text,
      correctAnswer: q.correct_answer,
      studentAnswer: answers[q.id] ?? "",
    }))

  const shortAnswerGrades = await gradeShortAnswers(shortAnswerItems)

  const results: QuestionResult[] = questions.map((q) => {
    const studentAnswer = answers[q.id] ?? ""
    let isCorrect: boolean
    let feedback: string | null = null

    if (q.question_type === "short_answer") {
      const grade = shortAnswerGrades.get(q.id)
      isCorrect = grade?.isCorrect ?? false
      feedback = grade?.feedback ?? null
    } else {
      isCorrect = normalize(studentAnswer) === normalize(q.correct_answer)
    }

    return {
      questionId: q.id,
      isCorrect,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      feedback,
    }
  })

  const score = results.filter((r) => r.isCorrect).length

  const { error: insertError } = await supabase.from("quiz_attempts").insert({
    quiz_id: quizId,
    user_id: user.id,
    score,
    total_questions: questions.length,
    answers,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/quizzes/${quizId}`)
  revalidatePath("/quizzes")
  return { score, totalQuestions: questions.length, results }
}

export async function deleteQuiz(quizId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("quizzes").delete().eq("id", quizId).eq("user_id", user.id)
  revalidatePath("/quizzes")
}
