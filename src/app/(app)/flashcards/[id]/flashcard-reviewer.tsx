"use client"

import { useState, useTransition } from "react"

import { reviewFlashcard } from "@/lib/actions/flashcards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Database } from "@/types/database.types"

type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"]

export function FlashcardReviewer({ cards }: { cards: Flashcard[] }) {
  // Freeze the review order for this session on mount — reviewing a card
  // updates its next_review_at and revalidates the page, which would
  // otherwise reshuffle this due-first sort out from under the live index.
  const [orderedCards] = useState(() =>
    [...cards].sort((a, b) => a.next_review_at.localeCompare(b.next_review_at))
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [tally, setTally] = useState({ gotIt: 0, missed: 0 })
  const [isDone, setIsDone] = useState(false)

  const currentCard = orderedCards[currentIndex]

  function handleReview(gotIt: boolean) {
    startTransition(async () => {
      await reviewFlashcard(currentCard.id, gotIt)
      setTally((prev) => ({
        gotIt: prev.gotIt + (gotIt ? 1 : 0),
        missed: prev.missed + (gotIt ? 0 : 1),
      }))

      if (currentIndex + 1 < orderedCards.length) {
        setCurrentIndex((i) => i + 1)
        setIsFlipped(false)
      } else {
        setIsDone(true)
      }
    })
  }

  function handleRestart() {
    setCurrentIndex(0)
    setIsFlipped(false)
    setTally({ gotIt: 0, missed: 0 })
    setIsDone(false)
  }

  if (isDone) {
    return (
      <Card>
        <CardContent className="grid gap-3 py-10 text-center">
          <p className="text-3xl font-semibold">Session complete</p>
          <div className="flex justify-center gap-2">
            <Badge variant="default">{tally.gotIt} got it</Badge>
            <Badge variant="destructive">{tally.missed} missed</Badge>
          </div>
          <Button onClick={handleRestart} className="mx-auto w-fit">
            Review again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Card {currentIndex + 1} of {orderedCards.length}
      </p>

      <Card
        data-testid="flashcard"
        className="min-h-[220px] cursor-pointer select-none"
        onClick={() => setIsFlipped((f) => !f)}
      >
        <CardContent className="flex h-full min-h-[220px] items-center justify-center p-8 text-center">
          <div className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isFlipped ? "Back" : "Front"}
            </span>
            <p className="text-lg font-medium">{isFlipped ? currentCard.back : currentCard.front}</p>
            {!isFlipped && (
              <p className="text-xs text-muted-foreground">Click to reveal the answer</p>
            )}
          </div>
        </CardContent>
      </Card>

      {isFlipped && (
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => handleReview(false)}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            Still learning
          </Button>
          <Button disabled={isPending} onClick={() => handleReview(true)}>
            Got it
          </Button>
        </div>
      )}
    </div>
  )
}
