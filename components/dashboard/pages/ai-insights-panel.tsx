"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Sparkles, Loader2, TrendingUp, TrendingDown, Minus,
    AlertTriangle, Target, Zap, RefreshCw, Brain, Clock,
    ChevronRight, Flame
} from "lucide-react"
import { supabase } from "@/utils/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"

/* ── types ─────────────────────────────────────────────────── */

interface DeepAnalysis {
    burnout_risk: number
    burnout_label: "Low" | "Moderate" | "High"
    focus_trend: "improving" | "stable" | "declining"
    trend_reason: string
    peak_hours: string
    distraction_profile: {
        primary: string
        secondary: string
        ai_comment: string
    }
    action_plan: Array<{
        icon: string
        title: string
        advice: string
    }>
    weekly_target: {
        sessions: number
        focus_hours: number
        rationale: string
    }
    encouragement: string
}

interface AIInsightsPanelProps {
    reportData?: {
        top_apps?: Array<{ app_name: string; duration_minutes: number }>
        top_websites?: Array<{ domain: string; duration_minutes: number }>
    } | null
    compact?: boolean
}

/* ── burnout gauge ────────────────────────────────────────── */

function BurnoutGauge({ risk, label }: { risk: number; label: string }) {
    const radius = 54
    const circumference = 2 * Math.PI * radius
    // Only sweep the bottom 180° arc
    const arcLength = circumference / 2
    const offset = arcLength - (risk / 100) * arcLength

    const color = risk < 35 ? "#22c55e" : risk < 65 ? "#f59e0b" : "#ef4444"
    const bgColor = risk < 35 ? "text-emerald-500/20" : risk < 65 ? "text-amber-500/20" : "text-red-500/20"

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: 140, height: 80 }}>
                <svg width="140" height="80" viewBox="0 0 140 80" className="overflow-visible">
                    {/* Background arc */}
                    <path
                        d="M 14 78 A 56 56 0 0 1 126 78"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeLinecap="round"
                        className="text-muted/30"
                    />
                    {/* Animated value arc */}
                    <path
                        d="M 14 78 A 56 56 0 0 1 126 78"
                        fill="none"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={arcLength}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
                    <span className="text-2xl font-bold" style={{ color }}>{risk}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
                </div>
            </div>
            <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${risk < 35
                    ? "bg-emerald-500/15 text-emerald-500"
                    : risk < 65
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-red-500/15 text-red-500"
                    }`}
            >
                {label} Risk
            </span>
        </div>
    )
}

/* ── trend badge ──────────────────────────────────────────── */

function TrendBadge({ trend, reason }: { trend: string; reason: string }) {
    const config = {
        improving: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Improving" },
        stable: { icon: Minus, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Stable" },
        declining: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Declining" },
    }[trend] || { icon: Minus, color: "text-muted-foreground", bg: "bg-muted/20 border-border", label: trend }

    const Icon = config.icon

    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg}`}>
            <div className={`p-2 rounded-lg bg-background/50 flex-shrink-0`}>
                <Icon size={18} className={config.color} />
            </div>
            <div>
                <p className={`text-sm font-semibold ${config.color}`}>Focus Trend: {config.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{reason}</p>
            </div>
        </div>
    )
}

/* ── skeleton loader ──────────────────────────────────────── */

function SkeletonBlock({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-muted/40 rounded-xl ${className}`} />
    )
}

function InsightsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonBlock className="h-44" />
                <SkeletonBlock className="h-44 md:col-span-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonBlock className="h-36" />
                <SkeletonBlock className="h-36" />
                <SkeletonBlock className="h-36" />
            </div>
            <SkeletonBlock className="h-28" />
        </div>
    )
}

/* ── main component ────────────────────────────────────────── */

export default function AIInsightsPanel({ reportData, compact = false }: AIInsightsPanelProps) {
    const { user } = useAuth()
    const [analysis, setAnalysis] = useState<DeepAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasGenerated, setHasGenerated] = useState(false)

    const generateAnalysis = async () => {
        if (!user) return
        setLoading(true)
        setError(null)

        try {
            // Fetch sessions from Supabase
            const { data: sessions, error: dbErr } = await supabase
                .from("study_sessions")
                .select("*")
                .eq("user_id", user.id)
                .order("started_at", { ascending: false })
                .limit(30)

            if (dbErr) throw dbErr

            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const res = await fetch("/api/ai-coach", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    type: "deep_analysis",
                    userName: user.name,
                    sessions: sessions || [],
                    reportData: reportData || null,
                }),
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "AI analysis failed")
            }

            const data: DeepAnalysis = await res.json()
            setAnalysis(data)
            setHasGenerated(true)
        } catch (e: any) {
            setError(e.message || "Failed to generate analysis. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

    return (
        <Card className="bg-card border-border overflow-hidden">
            {/* Gradient top stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

            <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-500/15">
                            <Sparkles size={20} className="text-violet-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">AI Productivity Analysis</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Powered by Gemini · Deep insights from your session history
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={generateAnalysis}
                        disabled={loading}
                        size="sm"
                        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                        {loading
                            ? <Loader2 size={14} className="animate-spin" />
                            : hasGenerated
                                ? <RefreshCw size={14} />
                                : <Sparkles size={14} />
                        }
                        {loading ? "Analyzing…" : hasGenerated ? "Refresh" : "Generate Analysis"}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">

                {/* Not yet generated */}
                {!loading && !analysis && !error && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center">
                                <Brain size={36} className="text-violet-400" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                <Sparkles size={12} className="text-violet-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base">Ready to analyse your productivity</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Click "Generate Analysis" to get your burnout risk, focus trend, personalised action plan, and more.
                            </p>
                        </div>
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && <InsightsSkeleton />}

                {/* Error state */}
                {error && !loading && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertTriangle size={18} className="flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Results */}
                {analysis && !loading && (
                    <div className="space-y-6 animate-in fade-in duration-500">

                        {/* Row 1: Burnout gauge + Trend + Peak hours */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Burnout Risk */}
                            <Card className="bg-muted/20 border-border">
                                <CardContent className="p-5 flex flex-col items-center gap-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Burnout Risk
                                    </p>
                                    <BurnoutGauge risk={analysis.burnout_risk} label={analysis.burnout_label} />
                                </CardContent>
                            </Card>

                            {/* Trend + Peak Hours stacked */}
                            <div className="md:col-span-2 flex flex-col gap-4">
                                <TrendBadge trend={analysis.focus_trend} reason={analysis.trend_reason} />

                                <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/10">
                                    <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
                                        <Clock size={18} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-amber-400">Peak Focus Window</p>
                                        <p className="text-base font-bold text-foreground mt-0.5">{analysis.peak_hours}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Schedule your most demanding work here</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Distraction Profile */}
                        <Card className="bg-muted/20 border-border">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                                        <Zap size={15} className="text-orange-400" />
                                    </div>
                                    <p className="text-sm font-semibold">Distraction Profile</p>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-medium border border-red-500/20">
                                        Primary: {analysis.distraction_profile.primary}
                                    </span>
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">
                                        Secondary: {analysis.distraction_profile.secondary}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {analysis.distraction_profile.ai_comment}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Row 3: Action Plan */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Target size={16} className="text-primary" />
                                <h3 className="text-sm font-semibold">Personalised Action Plan</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {analysis.action_plan.map((item, i) => (
                                    <Card key={i} className="bg-muted/20 border-border group hover:border-primary/40 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl">{item.icon}</span>
                                                <p className="text-sm font-semibold leading-tight">{item.title}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{item.advice}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Row 4: Weekly Target */}
                        <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-indigo-500/10 border-violet-500/20">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-violet-500/15">
                                            <Flame size={18} className="text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                                                AI-Recommended Weekly Target
                                            </p>
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <span className="text-sm">
                                                    <span className="text-2xl font-bold text-foreground">{analysis.weekly_target.sessions}</span>
                                                    <span className="text-muted-foreground ml-1">sessions</span>
                                                </span>
                                                <span className="text-muted-foreground">·</span>
                                                <span className="text-sm">
                                                    <span className="text-2xl font-bold text-foreground">{analysis.weekly_target.focus_hours}h</span>
                                                    <span className="text-muted-foreground ml-1">focus time</span>
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-sm">
                                                {analysis.weekly_target.rationale}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Encouragement */}
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10">
                            <Sparkles size={16} className="text-violet-400 flex-shrink-0" />
                            <p className="text-sm text-foreground italic leading-relaxed">"{analysis.encouragement}"</p>
                        </div>

                    </div>
                )}
            </CardContent>
        </Card>
    )
}
