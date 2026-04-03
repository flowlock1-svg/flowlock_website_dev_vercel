"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/utils/supabase/client"
import { useAuth } from "./auth-provider"

interface SessionContextType {
    sessions: any[]
    loading: boolean
    fetchSessionStats: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()

    const fetchSessionStats = async () => {
        if (!user?.id) return
        
        try {
            const { data, error } = await supabase
                .from("study_sessions")
                .select("*")
                .eq("user_id", user.id)
                .order("started_at", { ascending: false })
            
            if (error) throw error
            
            setSessions(data || [])
            if (typeof localStorage !== "undefined") {
                localStorage.setItem("flowlock_stats_cache", JSON.stringify({
                    sessions: data || [],
                    cached_at: new Date().toISOString()
                }))
            }
        } catch (err) {
            console.error("SessionContext fetch failed:", err)
        } finally {
            setLoading(false)
        }
    }

    // Initial load + Cache hydration
    useEffect(() => {
        if (!user?.id) return

        if (typeof localStorage !== "undefined") {
            const cache = localStorage.getItem("flowlock_stats_cache")
            if (cache) {
                try {
                    const { sessions: cachedSessions, cached_at } = JSON.parse(cache)
                    const ageHours = (Date.now() - new Date(cached_at).getTime()) / 3600000
                    if (ageHours < 24 && Array.isArray(cachedSessions)) {
                        setSessions(cachedSessions)
                    }
                } catch (e) {
                    console.error("Cache parse error", e)
                }
            }
        }

        fetchSessionStats()
    }, [user?.id])

    // Clean cache on logout
    useEffect(() => {
        if (user === null && typeof localStorage !== "undefined") {
            localStorage.removeItem("flowlock_stats_cache")
            setSessions([])
        }
    }, [user])

    // Realtime Backup
    useEffect(() => {
        if (!user?.id) return

        const channel = supabase
            .channel("session_updates")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "study_sessions",
                filter: `user_id=eq.${user.id}`
            }, () => {
                fetchSessionStats() // auto-refetch whenever a new row is inserted
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user?.id])

    return (
        <SessionContext.Provider value={{ sessions, loading, fetchSessionStats }}>
            {children}
        </SessionContext.Provider>
    )
}

export const useSessions = () => {
    const context = useContext(SessionContext)
    if (!context) {
        throw new Error("useSessions must be used within a SessionProvider")
    }
    return context
}
