"use client"

import { usePomodoro } from "@/components/providers/pomodoro-provider"
import { Flame, Info, Check } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export function PomodoroWidget() {
    const { state, settings } = usePomodoro()

    // Always show out of the configured max (default 4)
    const maxSessions = settings.sessionsBeforeLongBreak

    // Safe bounded standard sessions (in case it goes over due to rapid)
    const safeStandard = Math.min(state.standardSessionsCompleted, maxSessions)

    // Create an array of length `maxSessions`
    // fill with standard completed, and let the next available slot show a 'fire' if a rapid session is active
    const slots = Array.from({ length: maxSessions }, (_, i) => {
        // Is this a standard completed session?
        if (i < safeStandard) return "completed"

        // If we're at the next available slot, does it have a rapid session?
        // Since rapid sessions are basically "half" a standard session, we show them as partials
        if (i === safeStandard && state.rapidSessionsCompleted === 1) return "rapid"

        return "empty"
    })

    // How many more standard sessions until a long break?
    const sessionsLeft = maxSessions - safeStandard
    const isOneLeft = sessionsLeft === 1

    return (
        <div className="flex items-center gap-3 bg-secondary/30 border border-border px-4 py-2 rounded-full backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
                {slots.map((status, i) => (
                    <div
                        key={i}
                        className={`flex items-center justify-center w-6 h-6 rounded-md transition-all duration-300 border ${status === "completed"
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                                : status === "rapid"
                                    ? "bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/20 animate-pulse"
                                    : "bg-transparent border-dashed border-muted-foreground/40 text-transparent"
                            }`}
                    >
                        {status === "completed" ? (
                            <Check size={14} className="text-white" strokeWidth={3} />
                        ) : status === "rapid" ? (
                            <Flame size={12} className="text-white" />
                        ) : null}
                    </div>
                ))}
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                            <div className="flex flex-col">
                                <span className="text-[10px] leading-tight font-bold text-muted-foreground uppercase tracking-wider">Session</span>
                                <span className="text-xs font-medium leading-tight whitespace-nowrap">
                                    {safeStandard} / {maxSessions}
                                </span>
                            </div>
                            <Info size={12} className="text-muted-foreground ml-1" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                        {sessionsLeft === 0
                            ? "You earned a long break!"
                            : isOneLeft
                                ? "Just 1 more session until a long break!"
                                : `${sessionsLeft} more sessions until a long break.`}
                        {state.rapidSessionsCompleted > 0 && <span className="block mt-1 text-orange-500">1 rapid session complete. 1 more triggers a break!</span>}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
