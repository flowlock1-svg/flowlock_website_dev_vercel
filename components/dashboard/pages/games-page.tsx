"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TicTacToe } from "@/components/games/tic-tac-toe"
import { Sudoku } from "@/components/games/sudoku"
import { MemoryFlip } from "@/components/games/memory-flip"

export function GamesPage() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  const games = [
    { id: "tic-tac-toe", name: "Tic Tac Toe", icon: "⭕", desc: "Classic strategy game" },
    { id: "sudoku", name: "Sudoku", icon: "🔢", desc: "Logic puzzle game" },
    { id: "memory", name: "Memory Flip", icon: "🧠", desc: "Test your memory" },
  ]

  const renderGame = () => {
    switch (selectedGame) {
      case "tic-tac-toe":
        return <TicTacToe onClose={() => setSelectedGame(null)} />
      case "sudoku":
        return <Sudoku onClose={() => setSelectedGame(null)} />
      case "memory":
        return <MemoryFlip onClose={() => setSelectedGame(null)} />
      default:
        return null
    }
  }

  if (selectedGame) {
    return (
      <div className="p-8">
        <Button onClick={() => setSelectedGame(null)} variant="outline" className="mb-4">
          ← Back to Games
        </Button>
        {renderGame()}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Break-Time Games</h1>
        <p className="text-muted-foreground">Relax and have fun during your breaks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => (
          <Card
            key={game.id}
            className="bg-card border-border hover:border-primary transition-colors cursor-pointer"
            onClick={() => setSelectedGame(game.id)}
          >
            <CardHeader>
              <div className="text-5xl mb-3">{game.icon}</div>
              <CardTitle>{game.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{game.desc}</p>
              <Button className="w-full bg-primary hover:bg-primary/90">Play Now</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Game Features */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>About Break-Time Games</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Games are designed to:</p>
          <ul className="space-y-2 ml-4">
            <li>✓ Help your mind relax between study sessions</li>
            <li>✓ Keep you engaged and avoid unproductive distractions</li>
            <li>✓ Add an element of fun and reward to your study cycle</li>
            <li>✓ Improve cognitive function through quick mental exercises</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
