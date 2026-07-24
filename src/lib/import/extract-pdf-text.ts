import "server-only"
import { extractText, getDocumentProxy } from "unpdf"

const MAX_SIZE_BYTES = 8 * 1024 * 1024
const MIN_TEXT_LENGTH = 30

export class PdfExtractionError extends Error {}

export async function extractPdfText(file: File): Promise<string> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new PdfExtractionError("File is too large (max 8MB)")
  }

  let text: string
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const extracted = await extractText(pdf, { mergePages: true })
    text = extracted.text
  } catch {
    throw new PdfExtractionError(
      "Could not read this PDF. Make sure it's a valid, non-password-protected PDF file."
    )
  }

  if (text.trim().length < MIN_TEXT_LENGTH) {
    throw new PdfExtractionError(
      "This PDF doesn't contain readable text (it may be a scanned or image-based document). OCR-based import isn't supported yet — try a text-based PDF."
    )
  }

  return text
}
