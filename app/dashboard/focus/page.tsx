"use client"

import { FocusTracker } from "@/components/dashboard/pages/focus-tracker"
import { useAuth } from "@/components/providers/auth-provider"
import { useFocus } from "@/components/providers/focus-provider"

export default function FocusRoute() {
    const { user } = useAuth()
    const { setLastFocusSession } = useFocus()

    if (!user) return null

    if (user.role !== "student") {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">You don't have access to this page.</p>
            </div>
        )
    }

    return <FocusTracker onSessionComplete={setLastFocusSession} />
}
