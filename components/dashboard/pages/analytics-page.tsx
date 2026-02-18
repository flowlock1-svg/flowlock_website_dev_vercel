"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Clock, Target, Flame, TrendingUp } from "lucide-react"

type Period = "Daily" | "Weekly" | "Monthly" | "Yearly"

/* ── mock data generators ──────────────────────────────────── */

const dailySessions = [
  { time: "12 – 3 AM", focusMin: 5 },
  { time: "3 – 6 AM", focusMin: 0 },
  { time: "6 – 9 AM", focusMin: 75 },
  { time: "9 AM – 12 PM", focusMin: 140 },
  { time: "12 – 3 PM", focusMin: 100 },
  { time: "3 – 6 PM", focusMin: 90 },
  { time: "6 – 9 PM", focusMin: 110 },
  { time: "9 PM – 12 AM", focusMin: 20 },
]

const weeklyData = [
  { day: "Mon", focusMin: 180, sessions: 4, score: 88 },
  { day: "Tue", focusMin: 220, sessions: 5, score: 91 },
  { day: "Wed", focusMin: 150, sessions: 3, score: 78 },
  { day: "Thu", focusMin: 260, sessions: 6, score: 94 },
  { day: "Fri", focusMin: 200, sessions: 4, score: 85 },
  { day: "Sat", focusMin: 90, sessions: 2, score: 72 },
  { day: "Sun", focusMin: 120, sessions: 3, score: 80 },
]

const monthlyData = [
  { week: "Week 1", focusMin: 840, sessions: 18, avgScore: 82 },
  { week: "Week 2", focusMin: 1020, sessions: 22, avgScore: 87 },
  { week: "Week 3", focusMin: 960, sessions: 20, avgScore: 85 },
  { week: "Week 4", focusMin: 1100, sessions: 24, avgScore: 90 },
]

/** Generate 365 days of mock focus data for the yearly heatmap */
function generateYearlyData(): { date: Date; focusMin: number }[] {
  const data: { date: Date; focusMin: number }[] = []
  const today = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // Weighted random: most days 0-60, some days higher
    const rand = Math.random()
    let focusMin = 0
    if (rand > 0.25) focusMin = Math.floor(Math.random() * 40) + 5
    if (rand > 0.55) focusMin = Math.floor(Math.random() * 80) + 30
    if (rand > 0.85) focusMin = Math.floor(Math.random() * 120) + 60
    // weekends lower
    if (d.getDay() === 0 || d.getDay() === 6) focusMin = Math.floor(focusMin * 0.4)
    data.push({ date: d, focusMin })
  }
  return data
}

/* ── stat card ─────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── bar helpers ───────────────────────────────────────────── */

function HorizontalBar({ label, value, max, unit = "m" }: { label: string; value: number; max: number; unit?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all bg-primary"
          style={{ width: `${Math.max((value / max) * 100, 2)}%` }}
        />
      </div>
      <span className="w-14 text-right text-xs font-medium">{value}{unit}</span>
    </div>
  )
}

function VerticalBar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = Math.max((value / max) * 100, 4)
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-medium">{value}m</span>
      <div className="w-full max-w-[40px] bg-muted rounded-t-md overflow-hidden" style={{ height: 140 }}>
        <div className="w-full bg-primary rounded-t-md transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
      </div>
      <span className="text-xs font-medium">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

/* ── daily view ────────────────────────────────────────────── */

/* ── daily view (recharts) ────────────────────────────────── */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-popover-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value}m
        </p>
      </div>
    )
  }
  return null
}

function DailyView() {
  const totalMin = dailySessions.reduce((s, d) => s + d.focusMin, 0)
  const sessionCount = dailySessions.filter(d => d.focusMin > 0).length
  const avgScore = sessionCount > 0 ? Math.round(totalMin / sessionCount) : 0
  const peakBlock = dailySessions.reduce((a, b) => b.focusMin > a.focusMin ? b : a).time

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Total Focus" value={`${Math.floor(totalMin / 60)}h ${totalMin % 60}m`} color="bg-primary/20 text-primary" />
        <StatCard icon={Target} label="Sessions" value={`${sessionCount}`} color="bg-emerald-500/20 text-emerald-500" />
        <StatCard icon={TrendingUp} label="Avg / Session" value={`${avgScore}m`} color="bg-blue-500/20 text-blue-500" />
        <StatCard icon={Flame} label="Peak Block" value={peakBlock.split(" ")[0] + (peakBlock.includes("AM") ? " AM" : " PM")} sub={peakBlock} color="bg-orange-500/20 text-orange-500" />
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg">Today&apos;s Focus Timeline</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySessions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v.split(" ")[0]} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
              <Bar dataKey="focusMin" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Session Quality</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailySessions.filter(d => d.focusMin > 0).map(item => {
                const quality = item.focusMin >= 100 ? "Deep Focus" : item.focusMin >= 40 ? "Moderate" : "Light"
                const qColor = item.focusMin >= 100 ? "text-emerald-500" : item.focusMin >= 40 ? "text-amber-500" : "text-muted-foreground"
                return (
                  <div key={item.time} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.time}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{item.focusMin}m</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-opacity-10 ${qColor.replace("text-", "bg-")} ${qColor}`}>{quality}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ── weekly view (recharts) ────────────────────────────────── */

function WeeklyView() {
  const totalMin = weeklyData.reduce((s, d) => s + d.focusMin, 0)
  const totalSessions = weeklyData.reduce((s, d) => s + d.sessions, 0)
  const avgScore = Math.round(weeklyData.reduce((s, d) => s + d.score, 0) / 7)
  const bestDay = weeklyData.reduce((a, b) => b.focusMin > a.focusMin ? b : a).day

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Weekly Focus" value={`${Math.floor(totalMin / 60)}h ${totalMin % 60}m`} color="bg-primary/20 text-primary" />
        <StatCard icon={Target} label="Total Sessions" value={`${totalSessions}`} color="bg-emerald-500/20 text-emerald-500" />
        <StatCard icon={TrendingUp} label="Avg Focus Score" value={`${avgScore}%`} color="bg-blue-500/20 text-blue-500" />
        <StatCard icon={Flame} label="Best Day" value={bestDay} color="bg-orange-500/20 text-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Weekly Focus Breakdown</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                <Bar dataKey="focusMin" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Daily Focus Scores</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                        <p className="text-sm font-medium text-popover-foreground">{label}</p>
                        <p className="text-sm text-emerald-500 font-bold">{payload[0].value}% Score</p>
                      </div>
                    )
                  }
                  return null
                }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--background)", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ── monthly view (recharts) ───────────────────────────────── */

function MonthlyView() {
  const totalMin = monthlyData.reduce((s, d) => s + d.focusMin, 0)
  const totalSessions = monthlyData.reduce((s, d) => s + d.sessions, 0)
  const avgScore = Math.round(monthlyData.reduce((s, d) => s + d.avgScore, 0) / 4)
  const bestWeek = monthlyData.reduce((a, b) => b.focusMin > a.focusMin ? b : a).week

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Monthly Focus" value={`${Math.floor(totalMin / 60)}h`} color="bg-primary/20 text-primary" />
        <StatCard icon={Target} label="Total Sessions" value={`${totalSessions}`} color="bg-emerald-500/20 text-emerald-500" />
        <StatCard icon={TrendingUp} label="Avg Score" value={`${avgScore}%`} color="bg-blue-500/20 text-blue-500" />
        <StatCard icon={Flame} label="Best Week" value={bestWeek} color="bg-orange-500/20 text-orange-500" />
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg">Weekly Focus Comparison</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                      <p className="text-sm font-medium text-popover-foreground">{label}</p>
                      <p className="text-sm text-foreground">{Math.floor(data.focusMin / 60)}h {data.focusMin % 60}m</p>
                      <p className="text-xs text-muted-foreground">{data.sessions} sessions</p>
                    </div>
                  )
                }
                return null
              }} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
              <Bar dataKey="focusMin" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

/* ── yearly heatmap (LeetCode-style) ──────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""]

function getHeatColor(minutes: number): string {
  if (minutes === 0) return "rgb(30, 30, 36)"
  if (minutes < 20) return "rgb(14, 68, 41)"
  if (minutes < 50) return "rgb(0, 109, 50)"
  if (minutes < 90) return "rgb(38, 166, 65)"
  return "rgb(57, 211, 83)"
}

function YearlyView() {
  const yearData = useMemo(() => generateYearlyData(), [])
  const totalMin = yearData.reduce((s, d) => s + d.focusMin, 0)
  const activeDays = yearData.filter(d => d.focusMin > 0).length

  // Calculate max streak
  let maxStreak = 0, currentStreak = 0
  for (const d of yearData) {
    if (d.focusMin > 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak) }
    else currentStreak = 0
  }

  // Build weeks grid (53 columns × 7 rows)
  const weeks: { date: Date; focusMin: number }[][] = []
  let currentWeek: { date: Date; focusMin: number }[] = []

  // Pad the first week with empty slots
  const firstDay = yearData[0].date.getDay()
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({ date: new Date(0), focusMin: -1 }) // -1 = empty
  }

  for (const d of yearData) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ date: new Date(0), focusMin: -1 })
    weeks.push(currentWeek)
  }

  // Calculate month label positions
  const monthLabels: { month: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, colIdx) => {
    for (const cell of week) {
      if (cell.focusMin >= 0) {
        const m = cell.date.getMonth()
        if (m !== lastMonth) {
          monthLabels.push({ month: MONTHS[m], col: colIdx })
          lastMonth = m
        }
        break
      }
    }
  })

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Total Focus" value={`${Math.floor(totalMin / 60)}h`} color="bg-primary/20 text-primary" />
        <StatCard icon={Target} label="Active Days" value={`${activeDays}`} sub="out of 365" color="bg-green-500/20 text-green-400" />
        <StatCard icon={Flame} label="Max Streak" value={`${maxStreak} days`} color="bg-orange-500/20 text-orange-400" />
        <StatCard icon={TrendingUp} label="Avg / Day" value={`${Math.round(totalMin / 365)}m`} color="bg-blue-500/20 text-blue-400" />
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">{activeDays} active days in the past year</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Total active days: <strong className="text-foreground">{activeDays}</strong></span>
              <span>Max streak: <strong className="text-foreground">{maxStreak}</strong></span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-0" style={{ minWidth: "max-content" }}>
              {/* Month labels */}
              <div className="flex ml-8 mb-1">
                {monthLabels.map((ml, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-muted-foreground"
                    style={{
                      position: "relative",
                      left: `${ml.col * 14}px`,
                      width: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ml.month}
                  </span>
                ))}
              </div>

              {/* Grid rows */}
              <div className="flex gap-0">
                {/* Day labels */}
                <div className="flex flex-col gap-[2px] mr-1 justify-start">
                  {DAYS.map((d, i) => (
                    <div key={i} className="h-[10px] w-6 text-[9px] text-muted-foreground flex items-center justify-end pr-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Heatmap grid */}
                <div className="flex gap-[2px]">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[2px]">
                      {week.map((cell, dIdx) => (
                        <div
                          key={dIdx}
                          className="rounded-[2px] transition-colors"
                          title={cell.focusMin >= 0
                            ? `${cell.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: ${cell.focusMin}m focus`
                            : ""}
                          style={{
                            width: 10,
                            height: 10,
                            backgroundColor: cell.focusMin < 0 ? "transparent" : getHeatColor(cell.focusMin),
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-1 mt-3 ml-8">
                <span className="text-[10px] text-muted-foreground mr-1">Less</span>
                {[0, 15, 40, 70, 120].map((v, i) => (
                  <div
                    key={i}
                    className="rounded-[2px]"
                    style={{ width: 10, height: 10, backgroundColor: getHeatColor(v) }}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

/* ── main component ────────────────────────────────────────── */

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("Daily")

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Analytics &amp; Reports</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Detailed insights into study behavior and performance
          </p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90 w-full md:w-auto">
          <Download size={18} /> Download Report
        </Button>
      </div>

      {/* Period Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["Daily", "Weekly", "Monthly", "Yearly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${period === p
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-muted"
              }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Period Content */}
      {period === "Daily" && <DailyView />}
      {period === "Weekly" && <WeeklyView />}
      {period === "Monthly" && <MonthlyView />}
      {period === "Yearly" && <YearlyView />}

      {/* Export Options */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start bg-transparent gap-2">
              <Download size={18} /> Export as PDF
            </Button>
            <Button variant="outline" className="justify-start bg-transparent gap-2">
              <Download size={18} /> Export as Excel
            </Button>
            <Button variant="outline" className="justify-start bg-transparent gap-2">
              <Download size={18} /> Export as CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
