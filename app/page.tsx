"use client"

import { LoginPage } from "@/components/auth/login-page"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import type { UserRole } from "./page"

export type { UserRole }

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  grade?: string
  className?: string
}

export default function Home() {
  const { isAuthenticated, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return null // or loading spinner
  }

  return <LoginPage onLogin={login} />
}
