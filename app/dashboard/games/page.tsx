"use client"

import { GamesPage } from "@/components/dashboard/pages/games-page"
import { useAuth } from "@/components/providers/auth-provider"

export default function GamesRoute() {
    const { user } = useAuth()
    if (!user) return null
    return <GamesPage />
}
