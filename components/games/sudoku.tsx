"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

const initialBoard = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
]

export function Sudoku({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState(initialBoard.map((row) => [...row]))

  const handleChange = (row: number, col: number, value: string) => {
    if (initialBoard[row][col] !== 0) return

    const newBoard = board.map((r) => [...r])
    newBoard[row][col] = value ? Number.parseInt(value) : 0
    setBoard(newBoard)
  }

  const resetGame = () => {
    setBoard(initialBoard.map((row) => [...row]))
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 p-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Sudoku Puzzle</h2>
        <p className="text-muted-foreground">Fill in the numbers 1-9 in each row, column, and 3x3 box</p>
      </div>

      <div className="grid gap-1 bg-card p-2 rounded-lg border-2 border-primary">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {row.map((value, colIndex) => (
              <input
                key={`${rowIndex}-${colIndex}`}
                type="number"
                min="0"
                max="9"
                value={value || ""}
                onChange={(e) => handleChange(rowIndex, colIndex, e.target.value)}
                disabled={initialBoard[rowIndex][colIndex] !== 0}
                className={`w-12 h-12 text-center text-lg font-bold rounded border border-border ${
                  initialBoard[rowIndex][colIndex] !== 0
                    ? "bg-muted text-primary font-bold"
                    : "bg-background text-foreground"
                } disabled:cursor-not-allowed`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={resetGame} className="bg-primary hover:bg-primary/90">
          Reset
        </Button>
        <Button onClick={onClose} variant="outline">
          Back to Games
        </Button>
      </div>
    </div>
  )
}
