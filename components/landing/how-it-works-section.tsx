import { CheckCircle2, Download, LogIn, PlayCircle } from "lucide-react"

const steps = [
  {
    title: "1. Create Account",
    description: "Sign up to access your personalized focus dashboard and configure your initial productivity rules.",
    icon: LogIn,
  },
  {
    title: "2. Install Agents",
    description: "Download the lightweight Windows Agent and Chrome Extension to monitor apps and browsing seamlessly.",
    icon: Download,
  },
  {
    title: "3. Start Session",
    description: "Launch a Focus Session. FlowLock immediately begins analyzing your workflow and intelligently blocking distractions.",
    icon: PlayCircle,
  },
  {
    title: "4. Review & Reset",
    description: "End your session to view real-time analytics, review AI coaching tips, and play a web-native game to reset your focus.",
    icon: CheckCircle2,
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-card/10 border-t border-border/40 relative overflow-hidden px-6 lg:px-8">
      {/* Abstract Background Element */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16 lg:mb-24">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            How to Execute
          </h2>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            Your journey to uninterrupted focus takes less than 3 minutes.
          </p>
        </div>
        
        <div className="relative">
          {/* Connecting line for desktop, centered behind icons */}
          <div className="absolute left-[50%] lg:left-0 lg:top-10 top-0 bottom-0 lg:bottom-auto lg:right-0 lg:h-1 w-1 lg:w-full -translate-x-1/2 lg:translate-x-0 hidden lg:block bg-gradient-to-r from-transparent via-primary/50 to-transparent" aria-hidden="true" />
          
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center group">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-background border-2 border-primary/50 shadow-lg shadow-primary/20 mb-8 transition-all duration-300 group-hover:scale-110 group-hover:border-primary group-hover:shadow-primary/40 relative z-10">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground text-center mb-4">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-center leading-relaxed text-lg max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
