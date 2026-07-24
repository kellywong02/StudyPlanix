import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { extractPdfText, PdfExtractionError } from "@/lib/import/extract-pdf-text"
import { parsePdfTimetable } from "@/lib/import/pdf-parser"

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
      { error: "PDF import is not configured. Set OPENAI_API_KEY." },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  let text: string
  try {
    text = await extractPdfText(file)
  } catch (err) {
    if (err instanceof PdfExtractionError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  try {
    const result = await parsePdfTimetable(text)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse PDF" },
      { status: 500 }
    )
  }
}
