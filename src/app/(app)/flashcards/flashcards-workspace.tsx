"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteFlashcardDeck } from "@/lib/actions/flashcards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Database } from "@/types/database.types"

type Course = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "name" | "color">

type DeckRow = Database["public"]["Tables"]["flashcard_decks"]["Row"] & {
  courses: Pick<Course, "name" | "color"> | null
  flashcards: { id: string; next_review_at: string }[]
}

const CARD_COUNT_OPTIONS = [10, 20, 30, 40]

export function FlashcardsWorkspace({
  decks,
  courses,
  nowIso,
}: {
  decks: DeckRow[]
  courses: Course[]
  nowIso: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [courseId, setCourseId] = useState<string>("__none__")
  const [cardCount, setCardCount] = useState("20")
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsGenerating(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("cardCount", cardCount)
    if (courseId !== "__none__") formData.append("courseId", courseId)

    try {
      const res = await fetch("/api/flashcards/generate", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate flashcards")
        return
      }
      toast.success("Flashcards generated")
      router.push(`/flashcards/${data.deckId}`)
    } catch {
      toast.error("Failed to generate flashcards")
    } finally {
      setIsGenerating(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(deckId: string) {
    await deleteFlashcardDeck(deckId)
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-3 py-6">
          <p className="text-sm text-muted-foreground">
            Upload a PDF of your course material — lecture notes, slides, or a syllabus — and the
            AI will generate a deck of flashcards for spaced review.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger size="sm" className="w-[200px]">
                <SelectValue placeholder="Course (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No course</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cardCount} onValueChange={setCardCount}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_COUNT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} cards
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isGenerating}
            className="h-auto cursor-pointer py-1.5 file:mr-3 file:cursor-pointer file:rounded-md file:bg-secondary file:px-3 file:py-1.5 file:text-secondary-foreground"
          />
          {isGenerating && (
            <p className="text-sm text-muted-foreground">
              Generating flashcards — this can take a bit...
            </p>
          )}
        </CardContent>
      </Card>

      {decks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No flashcard decks yet. Upload a PDF above to generate your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => {
            const dueCount = d.flashcards.filter((c) => c.next_review_at <= nowIso).length

            return (
              <Card key={d.id}>
                <CardContent className="grid gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/flashcards/${d.id}`} className="font-medium hover:underline">
                      {d.title}
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(d.id)}
                      className="h-auto p-1 text-muted-foreground hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                  {d.courses && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: d.courses.color ?? "#3b82f6" }}
                      />
                      {d.courses.name}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {d.flashcards.length} card{d.flashcards.length === 1 ? "" : "s"}
                    {d.source_filename ? ` · ${d.source_filename}` : ""}
                  </p>
                  <Badge variant={dueCount > 0 ? "default" : "outline"} className="w-fit">
                    {dueCount > 0 ? `${dueCount} due for review` : "All caught up"}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
