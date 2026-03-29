import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, BrainCircuit, Gamepad2, LineChart, TimerReset } from "lucide-react"

const features = [
  {
    title: "Cross-Platform Tracking",
    description: "Install our background Windows agent and Chrome extension to capture all your workflow data across apps and websites automatically.",
    icon: Activity,
  },
  {
    title: "Smart Focus Timer",
    description: "Set your own productivity rules. FlowLock intelligently differentiates between deep-work applications and distractions in real time.",
    icon: TimerReset,
  },
  {
    title: "AI Productivity Coach",
    description: "Get personalized, AI-driven insights summarizing what distracted you and offering actionable advice to improve your daily habits.",
    icon: BrainCircuit,
  },
  {
    title: "Web-Native Active Breaks",
    description: "Take rejuvenating breaks without leaving your browser. Play fun, web-native games controlled entirely by your hand gestures via webcam.",
    icon: Gamepad2,
  },
  {
    title: "Performance Dashboard",
    description: "Visualize your entire day with beautifully crafted charts, pinpointing your exact focus trends and time wasted.",
    icon: LineChart,
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background relative border-t border-border/40 px-6 lg:px-8">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-0 -z-10 h-[200px] w-[200px] -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]"></div>

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-20 animate-fade-in-up">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            Engineered for Deep Work
          </h2>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            An interconnected suite of tools designed exclusively to stop procrastination and increase focus.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <Card 
              key={idx} 
              className={`bg-card/40 backdrop-blur-md border-muted/50 hover:border-primary/40 transition-all duration-300 shadow-none hover:shadow-[0_8px_30px_rgba(var(--primary),0.1)] group ${
                idx === 3 || idx === 4 ? "lg:col-span-1.5" : ""
              }`}
            >
              <CardHeader>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-lg">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
