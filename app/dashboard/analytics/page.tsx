"use client"

import { AnalyticsPage } from "@/components/dashboard/pages/analytics-page"
import { useAuth } from "@/components/providers/auth-provider"

export default function AnalyticsRoute() {
    const { user } = useAuth()
    if (!user) return null
    return <AnalyticsPage />
}
