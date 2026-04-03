"use client"

import { LoginPage } from "@/components/auth/login-page"
import { useAuth } from "@/components/providers/auth-provider"
import { useEffect } from "react"
import { supabase } from "@/utils/supabase/client"

export default function LoginRoute() {
  const { demoLogin, signup } = useAuth()

  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.replace('/dashboard')
      }
    }
    checkAlreadyLoggedIn()
  }, [])

  return <LoginPage onDemoLogin={demoLogin} onSignup={signup} />
}
