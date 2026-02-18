"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AuthUser } from "@/app/page"

const DEMO_CREDENTIALS = {
  student: {
    id: "1",
    name: "Alex Johnson",
    email: "alex.johnson@student.edu",
    password: "student123",
    role: "student" as const,
    grade: "10th Grade",
    className: "Class A",
  },
  admin: {
    id: "3",
    name: "Admin User",
    email: "admin@flowlock.edu",
    password: "admin123",
    role: "admin" as const,
  },
}

export function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isSignup) {
      const demoUser = Object.values(DEMO_CREDENTIALS).find((u) => u.email === email && u.password === password)

      if (demoUser) {
        const { password: _, ...userWithoutPassword } = demoUser
        onLogin(userWithoutPassword as AuthUser)
      } else {
        setError("Invalid email or password. Try using demo credentials below.")
      }
    } else {
      onLogin({
        id: String(Math.random()),
        name,
        email,
        role: "student",
        grade: "12th Grade",
        className: "New Class",
      })
    }
  }

  const handleDemoLogin = (role: keyof typeof DEMO_CREDENTIALS) => {
    const demoUser = DEMO_CREDENTIALS[role]
    const { password: _, ...userWithoutPassword } = demoUser
    onLogin(userWithoutPassword as AuthUser)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl w-full">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col justify-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold text-primary">FlowLock</h1>
              <p className="text-xl text-muted-foreground">Master Your Focus, Maximize Your Potential</p>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div className="flex gap-3">
                <div className="text-2xl">✓</div>
                <div>
                  <h3 className="font-semibold text-foreground">Real-Time Focus Tracking</h3>
                  <p className="text-sm">Monitor your study sessions with precision</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">✓</div>
                <div>
                  <h3 className="font-semibold text-foreground">Performance Analytics</h3>
                  <p className="text-sm">Visualize your progress over time</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">✓</div>
                <div>
                  <h3 className="font-semibold text-foreground">Break-Time Games</h3>
                  <p className="text-sm">Stay engaged with fun, productive breaks</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{isSignup ? "Create Account" : "Sign In"}</CardTitle>
              <CardDescription>
                {isSignup ? "Join FlowLock and start tracking your focus" : "Welcome back! Log in to continue"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  {isSignup ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Demo Credentials</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("student")}
                    className="text-xs"
                  >
                    Student
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin("admin")}
                    className="text-xs"
                  >
                    Admin
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(!isSignup)
                      setError("")
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
