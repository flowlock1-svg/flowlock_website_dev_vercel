"use client"

import type { AuthUser } from "@/components/providers/auth-provider"
import { useState } from "react"
import { Sidebar } from "./sidebar"
import { DashboardHome } from "./pages/dashboard-home"
import { AnalyticsPage } from "./pages/analytics-page"
import { SettingsPage } from "./pages/settings-page"
import { GamesPage } from "./pages/games-page"
import { AdminPanel } from "./pages/admin-panel"
import { StudySession } from "./pages/study-session"
import { FocusTracker, type FocusSessionResult } from "./pages/focus-tracker"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Settings, User } from "lucide-react"

export function DashboardLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [lastFocusSession, setLastFocusSession] = useState<FocusSessionResult | null>(null)

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardHome user={user} lastFocusSession={lastFocusSession} />
      case "study":
        if (user.role === "student") {
          return <StudySession user={user} onSessionComplete={setLastFocusSession} />
        } else {
          return (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You don't have access to this page.</p>
            </div>
          )
        }
      case "users":
        if (user.role === "admin") {
          return <AdminPanel />
        } else {
          return (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You don't have access to this page.</p>
            </div>
          )
        }
      case "focus":
        if (user.role === "student") {
          return <FocusTracker onSessionComplete={setLastFocusSession} />
        } else {
          return (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You don't have access to this page.</p>
            </div>
          )
        }
      case "analytics":
        return <AnalyticsPage />
      case "games":
        return <GamesPage />
      case "settings":
        return <SettingsPage />
      default:
        return <DashboardHome user={user} lastFocusSession={lastFocusSession} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} userRole={user.role} onLogout={onLogout} />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-primary">FlowLock</h1>
              <div className="ml-auto flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src="/placeholder-user.jpg" alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCurrentPage("settings")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCurrentPage("settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={onLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
        <div className="p-6">{renderPage()}</div>
      </main>
    </div>
  )
}
