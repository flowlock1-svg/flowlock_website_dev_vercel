"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

const EMOJIS = ["🎮", "🎨", "🎭", "🎪", "🎯", "🎲", "🎸", "🎺"]
const CARDS = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5)

export function MemoryFlip({ onClose }: { onClose: () => void }) {
  const [cards, setCards] = useState(CARDS.map((emoji) => ({ emoji, flipped: false, matched: false })))
  const [flipped, setFlipped] = useState<number[]>([])
  const [moves, setMoves] = useState(0)

  useEffect(() => {
    if (flipped.length === 2) {
      setTimeout(() => {
        if (cards[flipped[0]].emoji === cards[flipped[1]].emoji) {
          setCards((prev) => prev.map((card, i) => (flipped.includes(i) ? { ...card, matched: true } : card)))
        }
        setFlipped([])
        setMoves((prev) => prev + 1)
      }, 500)
    }
  }, [flipped, cards])

  const handleClick = (index: number) => {
    if (flipped.length < 2 && !flipped.includes(index) && !cards[index].matched && !cards[index].flipped) {
      setFlipped([...flipped, index])
    }
  }

  const resetGame = () => {
    setCards(CARDS.map((emoji) => ({ emoji, flipped: false, matched: false })))
    setFlipped([])
    setMoves(0)
  }

  const matchedCount = cards.filter((c) => c.matched).length

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 p-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Memory Flip</h2>
        <p className="text-lg text-muted-foreground">
          Moves: {moves} | Matched: {matchedCount / 2}/8
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-md">
        {cards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className={`w-20 h-20 rounded-lg font-bold text-3xl transition-all ${
              card.matched || flipped.includes(index)
                ? "bg-accent text-accent-foreground"
                : "bg-primary text-primary-foreground hover:opacity-80"
            }`}
          >
            {card.matched || flipped.includes(index) ? card.emoji : "?"}
          </button>
        ))}
      </div>

      {matchedCount === CARDS.length && (
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-primary">🎉 You won in {moves} moves!</p>
          <Button onClick={resetGame} className="bg-primary hover:bg-primary/90">
            Play Again
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {matchedCount < CARDS.length && (
          <Button onClick={resetGame} className="bg-primary hover:bg-primary/90">
            Reset
          </Button>
        )}
        <Button onClick={onClose} variant="outline">
          Back to Games
        </Button>
      </div>
    </div>
  )
}
