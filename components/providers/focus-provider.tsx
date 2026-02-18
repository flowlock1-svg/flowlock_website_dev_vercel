"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { FocusSessionResult } from "@/components/dashboard/pages/focus-tracker"

interface FocusContextType {
    lastFocusSession: FocusSessionResult | null
    setLastFocusSession: (session: FocusSessionResult | null) => void
}

const FocusContext = createContext<FocusContextType | undefined>(undefined)

export function FocusProvider({ children }: { children: ReactNode }) {
    const [lastFocusSession, setLastFocusSession] = useState<FocusSessionResult | null>(null)

    return (
        <FocusContext.Provider value={{ lastFocusSession, setLastFocusSession }}>
            {children}
        </FocusContext.Provider>
    )
}

export function useFocus() {
    const context = useContext(FocusContext)
    if (context === undefined) {
        throw new Error("useFocus must be used within a FocusProvider")
    }
    return context
}
