"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TicTacToe } from "@/components/games/tic-tac-toe"
import { Sudoku } from "@/components/games/sudoku"
import { MemoryFlip } from "@/components/games/memory-flip"
import { ChessGame } from "@/components/games/chess-game"
import { Hand, Wifi, WifiOff, Loader2 } from "lucide-react"

const GESTURE_SERVER = "http://localhost:5050"

type GestureStatus = "checking" | "active" | "inactive" | "unavailable"

const GESTURE_GUIDE = [
  { gesture: "✋ All fingers up", action: "Move mouse cursor" },
  { gesture: "☝️ Index finger only", action: "Left click" },
  { gesture: "🤙 Pinky only", action: "Right click" },
  { gesture: "👍 Thumb only", action: "Scroll up" },
  { gesture: "✊ Fist", action: "Scroll down" },
]

export function GamesPage() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [gestureStatus, setGestureStatus] = useState<GestureStatus>("checking")
  const [gestureLoading, setGestureLoading] = useState(false)

  // Check gesture server status on mount
  useEffect(() => {
    let mounted = true
    fetch(`${GESTURE_SERVER}/status`)
      .then((r) => r.json())
      .then((d) => { if (mounted) setGestureStatus(d.running ? "active" : "inactive") })
      .catch(() => { if (mounted) setGestureStatus("unavailable") })
    return () => { mounted = false }
  }, [])

  // Auto-stop gesture control when leaving the games page
  useEffect(() => {
    return () => {
      fetch(`${GESTURE_SERVER}/stop`, { method: "POST" }).catch(() => {})
    }
  }, [])

  const toggleGesture = useCallback(async () => {
    if (gestureStatus === "unavailable") return
    setGestureLoading(true)
    try {
      const endpoint = gestureStatus === "active" ? "/stop" : "/start"
      const res = await fetch(`${GESTURE_SERVER}${endpoint}`, { method: "POST" })
      const data = await res.json()
      if (data.ok) setGestureStatus(gestureStatus === "active" ? "inactive" : "active")
    } catch {
      setGestureStatus("unavailable")
    } finally {
      setGestureLoading(false)
    }
  }, [gestureStatus])

  const games = [
    { id: "tic-tac-toe", name: "Tic Tac Toe", icon: "⭕", desc: "Classic strategy game" },
    { id: "sudoku", name: "Sudoku", icon: "🔢", desc: "Logic puzzle game" },
    { id: "memory", name: "Memory Flip", icon: "🧠", desc: "Test your memory" },
    { id: "chess", name: "Chess", icon: "♞", desc: "Classic strategy with AI" },
  ]

  const renderGame = () => {
    switch (selectedGame) {
      case "tic-tac-toe": return <TicTacToe onClose={() => setSelectedGame(null)} />
      case "sudoku":      return <Sudoku onClose={() => setSelectedGame(null)} />
      case "memory":      return <MemoryFlip onClose={() => setSelectedGame(null)} />
      case "chess":       return <ChessGame onClose={() => setSelectedGame(null)} />
      default:            return null
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

  const isActive = gestureStatus === "active"
  const isUnavailable = gestureStatus === "unavailable"
  const isChecking = gestureStatus === "checking"

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Break-Time Games</h1>
        <p className="text-muted-foreground">Relax and have fun during your breaks</p>
      </div>

      {/* ── Hand Gesture Control Panel ── */}
      <Card className={`border-2 transition-colors ${isActive ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isActive ? "bg-emerald-500/20" : "bg-muted"}`}>
                <Hand size={20} className={isActive ? "text-emerald-500" : "text-muted-foreground"} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Hand Gesture Control
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                    isChecking   ? "bg-muted text-muted-foreground" :
                    isUnavailable? "bg-destructive/10 text-destructive" :
                    isActive     ? "bg-emerald-500/15 text-emerald-500" :
                                   "bg-muted text-muted-foreground"
                  }`}>
                    {isChecking    ? <><Loader2 size={10} className="animate-spin" /> Checking…</> :
                     isUnavailable ? <><WifiOff size={10} /> Server offline</> :
                     isActive      ? <><Wifi size={10} /> Active</> :
                                     "Inactive"}
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isUnavailable
                    ? "Start gesture_server.py to enable this feature"
                    : "Control your mouse with hand gestures via your webcam"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={isChecking || isUnavailable || gestureLoading}
              onClick={toggleGesture}
              className={isActive
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"}
              variant="ghost"
            >
              {gestureLoading
                ? <Loader2 size={14} className="animate-spin" />
                : isActive ? "Disable Gesture Control" : "Enable Gesture Control"}
            </Button>
          </div>
        </CardHeader>

        {/* Gesture guide — shown when active */}
        {isActive && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {GESTURE_GUIDE.map((g) => (
                <div key={g.action} className="flex flex-col gap-1 bg-background/60 rounded-lg px-3 py-2 text-xs border border-border">
                  <span className="text-base">{g.gesture.split(" ")[0]}</span>
                  <span className="text-muted-foreground font-medium leading-tight">{g.action}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Keep your hand inside the green rectangle in the webcam window. Press <kbd className="px-1 py-0.5 rounded bg-muted text-xs">ESC</kbd> in the webcam window to stop.
            </p>
          </CardContent>
        )}

        {/* Setup hint — shown when unavailable */}
        {isUnavailable && (
          <CardContent className="pt-0">
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground font-mono space-y-1">
              <p className="font-semibold text-foreground mb-2">To enable, run in your terminal:</p>
              <p>cd flowlock-main/backend</p>
              <p>pip install flask flask-cors mediapipe pyautogui</p>
              <p>python gesture_server.py</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Game Cards ── */}
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

      {/* About */}
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

