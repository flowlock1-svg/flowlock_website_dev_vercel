"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Timer, Eye, CheckCircle2, TrendingUp } from "lucide-react"
import type { AuthUser } from "@/app/page"
import type { FocusSessionResult } from "./focus-tracker"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Pie,
  PieChart,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts"

interface DashboardHomeProps {
  user: AuthUser
  lastFocusSession?: FocusSessionResult | null
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-popover-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value}
          {payload[0].name === "focus" || payload[0].payload.focus ? "m" : ""}
          {payload[0].name === "hours" ? "h" : ""}
          {payload[0].name === "value" ? "%" : ""}
        </p>
      </div>
    )
  }
  return null
}

export function DashboardHome({ user, lastFocusSession }: DashboardHomeProps) {
  const studyData = [
    { day: "Mon", focus: 240, breaks: 45 },
    { day: "Tue", focus: 280, breaks: 50 },
    { day: "Wed", focus: 320, breaks: 55 },
    { day: "Thu", focus: 250, breaks: 40 },
    { day: "Fri", focus: 290, breaks: 50 },
    { day: "Sat", focus: 200, breaks: 30 },
    { day: "Sun", focus: 150, breaks: 25 },
  ]

  const weeklyData = [
    { week: "Week 1", hours: 12.5 },
    { week: "Week 2", hours: 14.2 },
    { week: "Week 3", hours: 16.8 },
    { week: "Week 4", hours: 15.5 },
  ]

  const productivityData = [
    { name: "Productive", value: 75, color: "#a78bfa" }, // purple-400
    { name: "Neutral", value: 20, color: "#60a5fa" }, // blue-400
    { name: "Distracted", value: 5, color: "#f87171" }, // red-400
  ]

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {user.name}</h1>
        <p className="text-muted-foreground">
          Here's your study performance overview for {user.grade || "today"}.
        </p>
      </div>

      {/* Last Focus Session Banner */}
      {lastFocusSession && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-primary/10 border-emerald-500/20">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Eye size={24} className="text-emerald-500" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-medium text-foreground">Latest Focus Session</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  Score: <span className="font-bold text-emerald-500">{lastFocusSession.score}%</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>
                  Duration: {Math.floor(lastFocusSession.duration / 60000)}m {Math.floor((lastFocusSession.duration / 1000) % 60)}s
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>
                  {lastFocusSession.drowsyCount + lastFocusSession.headTurnedCount + lastFocusSession.faceMissingCount} distraction events
                </span>
              </div>
            </div>
            <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0 opacity-50" />
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Total Study Time</p>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">18.5h</p>
              <p className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                <TrendingUp size={12} /> +12% from last week
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Average Focus</p>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {lastFocusSession ? `${lastFocusSession.score}%` : "92%"}
              </p>
              <p className="text-xs font-medium text-emerald-500">
                {lastFocusSession ? "From last session" : "Excellent"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Avg. Session</p>
              <Timer size={16} className="text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">2h 15m</p>
              <p className="text-xs font-medium text-emerald-500">+15min improvement</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Breaks Taken</p>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">24</p>
              <p className="text-xs font-medium text-emerald-500">Healthy pace</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">7 days</p>
              <p className="text-xs font-medium text-amber-500">Keep it up!</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Focus Chart */}
        <Card>
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-base font-semibold">Weekly Focus Pattern</CardTitle>
          </CardHeader>
          <CardContent className="p-6 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={studyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}m`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                <Bar
                  dataKey="focus"
                  fill="currentColor"
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Productivity Distribution */}
        <Card>
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-base font-semibold">Productivity Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6 min-h-[300px] flex gap-4 items-center justify-center">
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productivityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {productivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-foreground">75%</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Productive</span>
              </div>
            </div>
            {/* Legend */}
            <div className="space-y-2 min-w-[120px]">
              {productivityData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-base font-semibold">Monthly Study Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis
                  dataKey="week"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}h`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Most Focused Time</p>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">2:00 PM - 4:00 PM</p>
              <p className="text-sm text-muted-foreground mt-1">Your peak productivity hours</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Distraction Alerts</p>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {lastFocusSession
                  ? lastFocusSession.drowsyCount + lastFocusSession.headTurnedCount + lastFocusSession.faceMissingCount
                  : 3}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {lastFocusSession ? "From last session" : "This week"}
                </span>
                {!lastFocusSession && <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">↓ 40%</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
