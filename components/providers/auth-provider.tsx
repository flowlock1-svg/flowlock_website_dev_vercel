"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"

export type UserRole = "student" | "admin"

export interface AuthUser {
    id: string
    name: string
    email: string
    role: UserRole
}

interface AuthContextType {
    user: AuthUser | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<{ error?: string }>
    signup: (email: string, password: string, name: string) => Promise<{ error?: string }>
    logout: () => void
    updateProfile: (userData: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(supaUser: User): Promise<AuthUser | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", supaUser.id)
        .single()

    if (error || !data) return null

    return {
        id: supaUser.id,
        name: data.full_name || supaUser.user_metadata?.full_name || "",
        email: data.email,
        role: data.role as "student" | "admin",
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Check existing session on mount
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                const profile = await fetchProfile(session.user)
                if (profile) {
                    setUser(profile)
                    setIsAuthenticated(true)
                }
            }
            setIsLoading(false)
        }

        initSession()

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_IN" && session?.user) {
                    const profile = await fetchProfile(session.user)
                    if (profile) {
                        setUser(profile)
                        setIsAuthenticated(true)
                    }
                } else if (event === "SIGNED_OUT") {
                    setUser(null)
                    setIsAuthenticated(false)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const login = async (email: string, password: string): Promise<{ error?: string }> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: error.message }
        router.push("/dashboard")
        return {}
    }

    const signup = async (email: string, password: string, name: string): Promise<{ error?: string }> => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, role: "student" },
            },
        })
        if (error) return { error: error.message }
        router.push("/dashboard")
        return {}
    }

    const logout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) console.error("Error during logout:", error)

        setUser(null)
        setIsAuthenticated(false)
        router.push("/")
    }

    const updateProfile = async (userData: Partial<AuthUser>) => {
        if (!user) return
        const updatedUser = { ...user, ...userData }
        setUser(updatedUser)

        // Persist to Supabase
        await supabase.from("profiles").update({
            full_name: updatedUser.name,
            role: updatedUser.role,
        }).eq("id", user.id)
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, signup, logout, updateProfile }}>
            {!isLoading && children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
