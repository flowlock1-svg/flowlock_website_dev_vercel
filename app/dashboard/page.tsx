"use client"

import { DashboardHome } from "@/components/dashboard/pages/dashboard-home"
import { useAuth } from "@/components/providers/auth-provider"
import { useFocus } from "@/components/providers/focus-provider"

export default function DashboardPage() {
    const { user } = useAuth()
    const { lastFocusSession } = useFocus()

    if (!user) return null

    return <DashboardHome user={user} lastFocusSession={lastFocusSession} />
}
