"use client"

import { usePomodoro } from "@/components/providers/pomodoro-provider"
import { Button } from "@/components/ui/button"
import { Play, SkipForward, Coffee, Zap, UserCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { useFocus } from "@/components/providers/focus-provider"
import { useRouter } from "next/navigation"

export function BreakOverlay() {
    const { state, decrementBreakTimer, updateBreakState, skipBreak } = usePomodoro()
    const [started, setStarted] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const router = useRouter()

    // Desktop Notification Logic
    useEffect(() => {
        if (state.isBreakActive && !started) {
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Time for a Break! ☕", { body: state.breakMessage })
            }
        }
    }, [state.isBreakActive, started, state.breakMessage])

    // Countdown logic
    useEffect(() => {
        if (!state.isBreakActive || !started) return

        const interval = setInterval(() => {
            decrementBreakTimer()
        }, 1000)

        return () => clearInterval(interval)
    }, [state.isBreakActive, started, decrementBreakTimer])

    // Break expiration logic
    useEffect(() => {
        // Automatically route and notify when timer exactly hits 0 while a break was started
        if (started && state.breakDurationRemaining <= 0) {
            updateBreakState(false)
            setStarted(false)
            setIsMinimized(false)

            // Fire completion notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Break Over! 🚀", { body: "Time to get back to your study session!" })
            }

            router.push("/dashboard/focus")
        }
    }, [started, state.breakDurationRemaining, router, updateBreakState])

    const { lastFocusSession } = useFocus()
    const isHighlyFocused = lastFocusSession && lastFocusSession.score > 85;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, "0")}`
    }

    const handleStartBreak = () => {
        setStarted(true)
    }

    const handlePlayGames = () => {
        setStarted(true)
        setIsMinimized(true)
        router.push("/dashboard/games")
    }

    const handleSkip = () => {
        setStarted(false)
        setIsMinimized(false)
        skipBreak()

        // Fire skipped notification
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Break Skipped! 🚀", { body: "Jumping right back into focus mode." })
        }

        router.push("/dashboard/focus")
    }

    if (!state.isBreakActive) return null

    // Pick icon and color based on break type
    const isLongBreak = state.breakType === "long" || state.breakDurationRemaining > 10 * 60
    const Icon = isLongBreak ? Coffee : Zap
    const accentColor = isLongBreak ? "text-purple-500" : "text-emerald-500"
    const bgGradient = isLongBreak
        ? "from-purple-500/10 to-transparent"
        : "from-emerald-500/10 to-transparent"

    if (isMinimized) {
        return (
            <div className="sticky top-[73px] z-[100] mx-4 mt-2">
                <div className={`flex items-center justify-between gap-4 px-5 py-3 rounded-xl border backdrop-blur-sm shadow-sm ${isLongBreak ? 'bg-purple-500/10 border-purple-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Icon size={18} className={isLongBreak ? 'text-purple-500' : 'text-emerald-500'} />
                            <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse ${isLongBreak ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                        </div>
                        <span className={`text-sm font-semibold ${isLongBreak ? 'text-purple-400' : 'text-emerald-400'}`}>Enjoy your Game Time!</span>
                        <span className={`text-sm font-mono tabular-nums ${isLongBreak ? 'text-purple-300' : 'text-emerald-300'}`}>{formatTime(state.breakDurationRemaining)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSkip}
                            className="gap-1.5 h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                            <SkipForward size={14} />
                            End Break Early
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-lg"
                >
                    <Card className={`border-border overflow-hidden bg-card/95 shadow-2xl bg-gradient-to-b ${bgGradient}`}>
                        <CardContent className="pt-10 pb-10 px-8 text-center space-y-8">
                            <div className="mx-auto w-20 h-20 rounded-full bg-background flex items-center justify-center shadow-lg border border-border">
                                <Icon size={36} className={accentColor} />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold tracking-tight">Time for a Break</h2>
                                <p className="text-muted-foreground text-lg">{state.breakMessage}</p>
                            </div>

                            {started ? (
                                <div className="py-8">
                                    <div className="text-7xl font-bold font-mono tabular-nums tracking-tighter">
                                        {formatTime(state.breakDurationRemaining)}
                                    </div>
                                    {isHighlyFocused && !started && (
                                        <div className="flex items-center justify-center gap-2 text-emerald-500 bg-emerald-500/10 py-2 px-4 rounded-full mx-auto w-fit mb-4">
                                            <UserCheck size={16} />
                                            <span className="text-sm font-medium">You were highly focused! Keep it up.</span>
                                        </div>
                                    )}

                                    <Button
                                        variant="ghost"
                                        onClick={handleSkip}
                                        className="mt-8 text-muted-foreground hover:text-foreground"
                                    >
                                        End break early
                                    </Button>
                                </div>
                            ) : (
                                <div className="pt-6 space-y-6">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                                            Would you like to play some games during your break?
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                        <Button
                                            size="lg"
                                            onClick={handlePlayGames}
                                            className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                            <Play size={20} />
                                            Yes, take me to Games!
                                        </Button>
                                        <Button
                                            size="lg"
                                            onClick={handleStartBreak}
                                            className={`gap-2 w-full sm:w-auto ${isLongBreak ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                                        >
                                            <Coffee size={20} />
                                            No, just start {formatTime(state.breakDurationRemaining)} Break
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            onClick={handleSkip}
                                            className="gap-2 w-full sm:w-auto"
                                        >
                                            <SkipForward size={20} />
                                            Skip Break entirely
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
