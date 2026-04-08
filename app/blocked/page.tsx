import { Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BlockedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 max-w-md w-full text-center space-y-8 p-8 border border-border/50 bg-card/30 backdrop-blur-md rounded-3xl shadow-2xl animate-in zoom-in-95 fade-in duration-700">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative p-6 bg-primary/10 rounded-full border border-primary/30 text-primary">
              <Lock size={64} strokeWidth={1.5} />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            This site is locked
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed px-4">
            You added this to your Distraction Vault. Stay focused — your session is still active.
          </p>
        </div>

        <div className="pt-8">
          <Button asChild size="lg" className="w-full h-14 text-base rounded-xl shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:scale-[1.02] active:scale-95 transition-all">
            <Link href="/dashboard">
              Go back to FlowLock
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
