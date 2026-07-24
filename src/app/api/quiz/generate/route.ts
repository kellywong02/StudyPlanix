import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { extractPdfText, PdfExtractionError } from "@/lib/import/extract-pdf-text"
import { generateQuiz } from "@/lib/ai/generate-quiz"

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20]
const DEFAULT_QUESTION_COUNT = 10

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Quiz generation is not configured. Set OPENAI_API_KEY." },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  const courseId = formData.get("courseId")
  const requestedCount = Number(formData.get("questionCount"))
  const questionCount = QUESTION_COUNT_OPTIONS.includes(requestedCount)
    ? requestedCount
    : DEFAULT_QUESTION_COUNT

  let text: string
  try {
    text = await extractPdfText(file)
  } catch (err) {
    if (err instanceof PdfExtractionError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  let generated
  try {
    generated = await generateQuiz(text, questionCount)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate quiz" },
      { status: 500 }
    )
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      user_id: user.id,
      course_id: typeof courseId === "string" && courseId ? courseId : null,
      title: generated.title,
      source_filename: file.name,
    })
    .select("id")
    .single()

  if (quizError) {
    return NextResponse.json({ error: quizError.message }, { status: 500 })
  }

  const { error: questionsError } = await supabase.from("quiz_questions").insert(
    generated.questions.map((q, index) => ({
      quiz_id: quiz.id,
      user_id: user.id,
      order_index: index,
      question_type: q.questionType,
      question_text: q.questionText,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
    }))
  )

  if (questionsError) {
    await supabase.from("quizzes").delete().eq("id", quiz.id)
    return NextResponse.json({ error: questionsError.message }, { status: 500 })
  }

  return NextResponse.json({ quizId: quiz.id })
}
