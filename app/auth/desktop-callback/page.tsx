"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/utils/supabase/client"
import { Loader2 } from "lucide-react"

export default function DesktopCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState("Authenticating desktop agent...")

  useEffect(() => {
    let mounted = true
    const redirect = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          // If no session, redirect to login with a next param that returns here
          if (mounted) setStatus("No active session found. Please log in first.")
          setTimeout(() => {
            if (mounted) router.push('/login?next=/auth/desktop-callback')
          }, 1500)
          return
        }

        if (mounted) setStatus("Connecting to FlowLock Desktop Agent...")

        // Redirect deep link with tokens
        const accessToken = encodeURIComponent(session.access_token)
        const refreshToken = encodeURIComponent(session.refresh_token)
        
        window.location.href = `flowlock://auth?access_token=${accessToken}&refresh_token=${refreshToken}`

        // Provide a fallback in case the deep link fails/app isn't installed
        setTimeout(() => {
           if (mounted) setStatus("If the app didn't open automatically, make sure the desktop agent is installed and running.")
        }, 3000)

      } catch (err) {
        console.error(err)
        if (mounted) setStatus("An error occurred during authentication.")
      }
    }

    redirect()

    return () => {
      mounted = false
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative p-4 bg-primary/10 rounded-full text-primary border border-primary/20 animate-spin">
              <Loader2 size={48} strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Desktop Connection
        </h1>
        <p className="text-muted-foreground font-medium">
          {status}
        </p>
      </div>
    </div>
  )
}
