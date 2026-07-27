"use client"

import { useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import type { Database } from "@/types/database.types"

type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"]

export function FlashcardReviewer({ cards }: { cards: Flashcard[] }) {
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set())

  function toggleCard(cardId: string) {
    setFlippedIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Click any card to flip it — flip as many as you want, in any order.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const isFlipped = flippedIds.has(card.id)

          return (
            <Card
              key={card.id}
              data-testid="flashcard"
              className="min-h-[160px] cursor-pointer select-none"
              onClick={() => toggleCard(card.id)}
            >
              <CardContent className="flex h-full min-h-[160px] items-center justify-center p-6 text-center">
                <div className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {isFlipped ? "Back" : "Front"}
                  </span>
                  <p className="text-base font-medium">{isFlipped ? card.back : card.front}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
