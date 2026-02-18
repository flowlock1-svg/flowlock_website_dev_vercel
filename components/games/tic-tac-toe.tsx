"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function TicTacToe({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [gameStatus, setGameStatus] = useState<string>("")

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const winner = calculateWinner(board)

  const handleClick = (index: number) => {
    if (board[index] || winner) return
    const newBoard = [...board]
    newBoard[index] = isXNext ? "X" : "O"
    setBoard(newBoard)
    setIsXNext(!isXNext)
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setIsXNext(true)
    setGameStatus("")
  }

  const isBoardFull = board.every((square) => square !== null)

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Tic Tac Toe</h2>
        {winner ? (
          <p className="text-lg text-primary">🎉 Player {winner} wins!</p>
        ) : isBoardFull ? (
          <p className="text-lg text-accent">It's a draw!</p>
        ) : (
          <p className="text-lg">Current Player: {isXNext ? "X" : "O"}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 bg-card p-4 rounded-lg border border-border">
        {board.map((value, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className="w-24 h-24 bg-background border-2 border-border rounded-lg text-4xl font-bold hover:bg-muted transition-colors"
          >
            {value}
          </button>
        ))}
      </div>

      <Button onClick={resetGame} className="bg-primary hover:bg-primary/90">
        New Game
      </Button>
      <Button onClick={onClose} variant="outline">
        Back to Games
      </Button>
    </div>
  )
}
