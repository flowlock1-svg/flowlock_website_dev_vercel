"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { toast } from "sonner"

// Type for the internal settings state
export interface PomodoroSettings {
    studyDuration: number
    shortBreakDuration: number
    longBreakDuration: number
    longSessionThreshold: number
    rapidSessionLength: number
    sessionsBeforeLongBreak: number
}

// Default settings
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
    studyDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longSessionThreshold: 30,
    rapidSessionLength: 15,
    sessionsBeforeLongBreak: 4,
}

// State of the current session cycle
export interface PomodoroState {
    standardSessionsCompleted: number
    rapidSessionsCompleted: number
    isBreakActive: boolean
    breakType: "short" | "long" | "rapid" | "none"
    breakDurationRemaining: number // in seconds
    breakMessage: string
}

export interface PomodoroContextType {
    settings: PomodoroSettings
    state: PomodoroState
    updateSettings: (newSettings: Partial<PomodoroSettings>) => void
    completeSession: (durationMinutes: number) => void
    startBreak: () => void
    skipBreak: () => void
    resetCycles: () => void
    decrementBreakTimer: () => void
    updateBreakState: (isActive: boolean) => void
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined)

export function PomodoroProvider({ children }: { children: ReactNode }) {
    // Settings state (hydrated from localStorage)
    const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS)

    // Tracker state
    const [state, setState] = useState<PomodoroState>({
        standardSessionsCompleted: 0,
        rapidSessionsCompleted: 0,
        isBreakActive: false,
        breakType: "none",
        breakDurationRemaining: 0,
        breakMessage: "",
    })

    // Load settings on mount
    useEffect(() => {
        const saved = localStorage.getItem("pomodoro_settings")
        if (saved) {
            try {
                setSettings({ ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(saved) })
            } catch (e) {
                console.error("Failed to parse pomodoro settings from localStorage")
            }
        }

        // Also load cycle state if we want it to persist across reloads
        const savedState = localStorage.getItem("pomodoro_state")
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState)
                setState(prev => ({ ...prev, standardSessionsCompleted: parsedState.standardSessionsCompleted || 0, rapidSessionsCompleted: parsedState.rapidSessionsCompleted || 0 }))
            } catch (e) { }
        }
    }, [])

    // Persist state when counters change
    useEffect(() => {
        localStorage.setItem("pomodoro_state", JSON.stringify({
            standardSessionsCompleted: state.standardSessionsCompleted,
            rapidSessionsCompleted: state.rapidSessionsCompleted
        }))
    }, [state.standardSessionsCompleted, state.rapidSessionsCompleted])

    const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
        setSettings((prev) => {
            const updated = { ...prev, ...newSettings }
            localStorage.setItem("pomodoro_settings", JSON.stringify(updated))
            return updated
        })
    }, [])

    // Evaluate if a break is needed based on a completed session
    // Rule 1: Long Session (single session running over threshold)
    // Rule 2: Rapid Cycles (2 back-to-back 15min sessions)
    // Rule 3: Pomodoro Long Break (after 4 standard lengths)
    const completeSession = useCallback(
        (durationMinutes: number) => {
            // Check for master toggle: if break alerts are OFF, we still track cycles but don't prompt overlays
            const alertsEnabled = localStorage.getItem("pref_break_alerts") !== "false"

            // We determine session "size" based on configured durations
            let newStandardCount = state.standardSessionsCompleted
            let newRapidCount = state.rapidSessionsCompleted

            let triggeredBreak = false
            let breakType: PomodoroState["breakType"] = "none"
            let breakDuration = 0
            let message = ""

            // 1. Check Long Session Threshold First (Rule 1)
            if (durationMinutes >= settings.longSessionThreshold) {
                // Add to standard count because they did a lot of work
                newStandardCount += 1

                if (alertsEnabled) {
                    triggeredBreak = true
                    breakType = "short"
                    breakDuration = settings.shortBreakDuration * 60
                    message = `You've studied continuously for ${Math.floor(durationMinutes)} mins.`
                }
            }
            // 2. Check Standard Pomodoro (usually 25 mins)
            else if (durationMinutes >= settings.studyDuration * 0.8) {
                newStandardCount += 1
                newRapidCount = 0 // Reset rapid cycle if they did a full pomodoro

                if (alertsEnabled) {
                    if (newStandardCount >= settings.sessionsBeforeLongBreak) {
                        // Time for a long break
                        triggeredBreak = true
                        breakType = "long"
                        breakDuration = settings.longBreakDuration * 60
                        message = `You've completed ${newStandardCount} focus sessions! Time for a longer rest.`
                        newStandardCount = 0 // Reset standard cycle
                    } else {
                        // Normal short break
                        triggeredBreak = true
                        breakType = "short"
                        breakDuration = settings.shortBreakDuration * 60
                        message = "Great focus! Time for a short break 🧠"
                    }
                }
            }
            // 3. Check Rapid Sessions (Rule 2) (usually 15 mins)
            else if (durationMinutes >= settings.rapidSessionLength * 0.8 && durationMinutes < settings.studyDuration * 0.8) {
                newRapidCount += 1

                if (alertsEnabled && newRapidCount >= 2) {
                    triggeredBreak = true
                    breakType = "rapid"
                    breakDuration = settings.shortBreakDuration * 60
                    message = `You've completed ${newRapidCount} rapid sessions.`
                    newRapidCount = 0 // Reset rapid cycle after triggering break
                }
            }

            // Update state
            setState((prev) => ({
                ...prev,
                standardSessionsCompleted: newStandardCount,
                rapidSessionsCompleted: newRapidCount,
                isBreakActive: triggeredBreak,
                breakType,
                breakDurationRemaining: breakDuration,
                breakMessage: message,
            }))
        },
        [settings, state.standardSessionsCompleted, state.rapidSessionsCompleted]
    )

    const startBreak = useCallback(() => {
        // Actually handled by BreakOverlay countdown, Provider just needs to know it's ticking
    }, [])

    const skipBreak = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isBreakActive: false,
            breakType: "none",
            breakDurationRemaining: 0,
        }))
        toast("Break skipped ⚠️", { icon: "🏃" })
    }, [])

    const resetCycles = useCallback(() => {
        setState((prev) => ({
            ...prev,
            standardSessionsCompleted: 0,
            rapidSessionsCompleted: 0,
            isBreakActive: false,
        }))
    }, [])

    const updateBreakState = useCallback((isActive: boolean) => {
        setState(prev => ({ ...prev, isBreakActive: isActive }))
    }, [])

    const decrementBreakTimer = useCallback(() => {
        setState((prev) => {
            if (prev.breakDurationRemaining <= 1) {
                // Break is over naturally
                return { ...prev, isBreakActive: false, breakType: "none", breakDurationRemaining: 0 }
            }
            return { ...prev, breakDurationRemaining: prev.breakDurationRemaining - 1 }
        })
    }, [])

    return (
        <PomodoroContext.Provider
            value={{
                settings,
                state,
                updateSettings,
                completeSession,
                startBreak,
                skipBreak,
                resetCycles,
                decrementBreakTimer,
                updateBreakState
            }}
        >
            {children}
        </PomodoroContext.Provider>
    )
}

export function usePomodoro() {
    const context = useContext(PomodoroContext)
    if (context === undefined) {
        throw new Error("usePomodoro must be used within a PomodoroProvider")
    }
    return context
}
