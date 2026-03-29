import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[85vh] overflow-hidden bg-background px-6 lg:px-8 text-center">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      <div className="absolute top-1/4 left-1/4 -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[300px] w-[300px] translate-x-1/2 translate-y-1/2 rounded-full bg-blue-500/20 blur-[120px]"></div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 animate-fade-in-up">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
          Now available on Windows and Chrome
        </div>
        
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-6">
          <span className="text-foreground">Master Your Focus.</span><br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Maximize Everything.
          </span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-muted-foreground mb-10 font-light">
          FlowLock unites AI-driven productivity analysis, cross-device tracking, and active gesture-controlled game breaks to help you orchestrate deep, uninterrupted flow.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary),0.5)] transition-all bg-primary hover:bg-primary/90 text-primary-foreground border border-primary">
              Get Started for Free
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full border-muted-foreground/30 hover:bg-muted/50 backdrop-blur-sm transition-all">
              See How It Works
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center text-muted-foreground">
        <span className="text-sm font-medium mb-2">Scroll to explore</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
      </div>
    </div>
  )
}
