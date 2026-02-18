"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { AuthUser } from "@/app/page"
import { useRouter } from "next/navigation"

interface AuthContextType {
    user: AuthUser | null
    isAuthenticated: boolean
    login: (user: AuthUser) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Check for persisted user in localStorage on mount
        const storedUser = localStorage.getItem("flowlock_user")
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser)
                setUser(parsedUser)
                setIsAuthenticated(true)
            } catch (e) {
                console.error("Failed to parse stored user", e)
                localStorage.removeItem("flowlock_user")
            }
        }
        setIsLoading(false)
    }, [])

    const login = (newUser: AuthUser) => {
        setUser(newUser)
        setIsAuthenticated(true)
        localStorage.setItem("flowlock_user", JSON.stringify(newUser))
        router.push("/dashboard")
    }

    const logout = () => {
        setUser(null)
        setIsAuthenticated(false)
        localStorage.removeItem("flowlock_user")
        router.push("/")
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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
