"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { FocusProvider } from "@/components/providers/focus-provider"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Settings, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, isAuthenticated, logout } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/")
        }
    }, [isAuthenticated, router])

    if (!user) return null

    return (
        <FocusProvider>
            <div className="flex h-screen bg-background">
                <AppSidebar userRole={user.role} onLogout={logout} />
                <main className="flex-1 overflow-auto flex flex-col">
                    <header className="border-b border-border bg-card sticky top-0 z-10">
                        <div className="flex justify-between items-center px-6 py-4">
                            <div className="flex items-center gap-4 w-full">
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
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard/settings" className="cursor-pointer">
                                                    <User className="mr-2 h-4 w-4" />
                                                    <span>Profile</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard/settings" className="cursor-pointer">
                                                    <Settings className="mr-2 h-4 w-4" />
                                                    <span>Settings</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" onClick={logout}>
                                                <LogOut className="mr-2 h-4 w-4" />
                                                <span>Log out</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </div>
        </FocusProvider>
    )
}
