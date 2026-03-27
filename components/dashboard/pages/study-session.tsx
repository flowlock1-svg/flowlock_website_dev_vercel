"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, RotateCcw, Zap, RefreshCcw, Music2, X, ChevronDown, Pause, Square, SkipForward, Clock } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { AuthUser } from "@/components/providers/auth-provider"
import { usePomodoro, DEFAULT_POMODORO_SETTINGS } from "@/components/providers/pomodoro-provider"
import { useFocus } from "@/components/providers/focus-provider"
import { useRouter } from "next/navigation"

// ─── Sonar mini-player data ──────────────────────────────────────────────────
const SONAR_TRACKS = [
  { text: "Ambient study lofi — low energy focus", videoId: "Q89Dzox4jAE" },
  { text: "Deep focus binaural beats", videoId: "n4YghVcjbpw" },
  { text: "Classical piano — deep work", videoId: "sAcj8me7wGI" },
  { text: "Cinematic textures — ambient minimal", videoId: "nPRrp-3sFgQ" },
  { text: "Brown noise — long session focus", videoId: "RqzGzwTY-6w" },
]

interface YTPlayer {
  loadVideoById: (id: string) => void
  playVideo: () => void
  pauseVideo: () => void
  getPlayerState: () => number
  destroy: () => void
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any
    onYouTubeIframeAPIReady?: () => void
  }
}

import { useAuth } from "@/components/providers/auth-provider"
import { SPOTIFY_PLAYLISTS } from "@/components/providers/focus-provider"

// ─── Mini inline player ───────────────────────────────────────────────────────
function SonarMiniPlayer() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"sonar" | "spotify">("sonar")
  const {
    sonarActiveId,
    isSonarPlaying,
    sonarDuration: duration,
    setSonarDuration: setDuration,
    playSonarTrack,
    spotifyActiveUri,
    isSpotifyPlaying,
    playSpotifyTrack,
    stopAllMusic
  } = useFocus()

  const [editingDuration, setEditingDuration] = useState(false)

  const hasSpotify = user?.isSpotifyLinked
  const isPlaying = isSonarPlaying || isSpotifyPlaying
  const activeAny = sonarActiveId || spotifyActiveUri

  return (
    <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
      {hasSpotify && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("sonar")}
            className={`flex-1 py-2 text-xs font-semibold ${activeTab === "sonar" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted/30"}`}
          >
            Built-in Tracks
          </button>
          <button
            onClick={() => setActiveTab("spotify")}
            className={`flex-1 py-2 text-xs font-semibold ${activeTab === "spotify" ? "text-[#1DB954] border-b-2 border-[#1DB954]" : "text-muted-foreground hover:bg-muted/30"}`}
          >
            Spotify Focus
          </button>
        </div>
      )}

      <div className="divide-y divide-border overflow-y-auto max-h-48 custom-scrollbar">
        {activeTab === "sonar" && SONAR_TRACKS.map((t) => {
          const active = sonarActiveId === t.videoId
          return (
            <button
              key={t.videoId}
              onClick={() => playSonarTrack(t.videoId)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60 ${active ? "bg-primary/10 text-primary" : "text-foreground"}`}
            >
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {active && isSonarPlaying ? <Pause size={12} /> : <Play size={12} />}
              </span>
              <span className="flex-1 truncate font-medium">{t.text}</span>
              {active && isSonarPlaying && (
                <span className="flex gap-0.5 items-end h-4 flex-shrink-0">
                  {[0.4, 0.7, 1, 0.6].map((h, i) => (
                    <span key={i} style={{
                      display: "inline-block",
                      width: 3, borderRadius: 2, background: "currentColor",
                      height: `${h * 100}%`,
                      animation: `studyBarGrow 0.8s ${i * 0.1}s infinite ease-in-out`,
                    }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}

        {activeTab === "spotify" && SPOTIFY_PLAYLISTS.map((t) => {
          const active = spotifyActiveUri === t.uri
          return (
            <button
              key={t.uri}
              onClick={() => playSpotifyTrack(t.uri)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60 ${active ? "bg-[#1DB954]/10 text-[#1DB954]" : "text-foreground"}`}
            >
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${active ? "bg-[#1DB954] text-white" : "bg-muted"}`}>
                {active && isSpotifyPlaying ? <Pause size={12} /> : <Play size={12} />}
              </span>
              <span className="flex-1 truncate font-medium">{t.text}</span>
              {active && isSpotifyPlaying && (
                <span className="flex gap-0.5 items-end h-4 flex-shrink-0 text-[#1DB954]">
                  {[0.4, 0.7, 1, 0.6].map((h, i) => (
                    <span key={i} style={{
                      display: "inline-block",
                      width: 3, borderRadius: 2, background: "currentColor",
                      height: `${h * 100}%`,
                      animation: `studyBarGrow 0.8s ${i * 0.1}s infinite ease-in-out`,
                    }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Control Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/30 border-t border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={stopAllMusic}
            disabled={!activeAny}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
            title="Stop Music"
          >
            <Square size={16} className={activeAny ? "fill-current" : ""} />
          </button>
          {/* Note: Next track logic is slightly complex across platforms so we leave it standard or platform-specific */}
        </div>
        <div className="flex items-center gap-2 text-sm">
           <Clock size={14} className="text-muted-foreground" />
           {editingDuration ? (
             <input
               type="number"
               autoFocus
               min={1}
               max={480}
               value={duration}
               onChange={e => setDuration(Number(e.target.value))}
               onBlur={() => setEditingDuration(false)}
               onKeyDown={e => { if (e.key === 'Enter') setEditingDuration(false) }}
               className="w-12 bg-transparent border-b border-primary text-primary outline-none text-center font-mono"
               onFocus={(e) => e.target.select()}
             />
           ) : (
              <button
                onClick={() => setEditingDuration(true)}
                className="font-mono text-primary hover:underline"
                title="Edit timer duration"
              >
                {duration}m
              </button>
           )}
        </div>
      </div>

      <style>{`
        @keyframes studyBarGrow {
          0%,100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  )
}

// ─── Music prompt banner ──────────────────────────────────────────────────────
function MusicPromptBanner() {
  const [answered, setAnswered] = useState(false)
  const [wantsMusic, setWantsMusic] = useState(false)
  const [open, setOpen] = useState(false)

  if (answered && !wantsMusic) return null

  if (!answered) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Music2 size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Want background music?</p>
            <p className="text-xs text-muted-foreground">Play focus music while you study</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs"
            onClick={() => { setAnswered(true); setWantsMusic(true); setOpen(true) }}
          >
            Yes!
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setAnswered(true); setWantsMusic(false) }}
          >
            No thanks
          </Button>
        </div>
      </div>
    )
  }

  // answered + wantsMusic = show collapsible player
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-violet-500/10 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <Music2 size={16} className="text-violet-400 flex-shrink-0" />
        <span className="text-sm font-semibold flex-1 text-left">Sonar Focus Music</span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        <button
          className="ml-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); setAnswered(false); setWantsMusic(false) }}
        >
          <X size={15} />
        </button>
      </button>
      {open && <SonarMiniPlayer />}
    </div>
  )
}

// ─── Wheel picker ─────────────────────────────────────────────────────────────
function WheelPicker({
  value,
  onChange,
  max,
  label
}: {
  value: number
  onChange: (val: number) => void
  max: number
  label: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const options = Array.from({ length: max + 1 }, (_, i) => i)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const itemHeight = 64
    const index = Math.round(container.scrollTop / itemHeight)
    if (index >= 0 && index <= max && index !== value) {
      onChange(index)
    }
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = value * 64
    }
  }, [value])

  return (
    <div className="flex flex-col items-center mx-2">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[192px] w-24 overflow-y-auto snap-y snap-mandatory no-scrollbar relative"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="h-[64px] snap-center" />
        {options.map((num) => (
          <div
            key={num}
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: num * 64, behavior: 'smooth' })
              }
            }}
            className={`h-[64px] flex items-center justify-center snap-center cursor-pointer transition-colors duration-200 ${value === num ? 'font-bold text-5xl text-primary' : 'text-3xl text-muted-foreground/40 hover:text-muted-foreground/80'
              }`}
          >
            {num.toString().padStart(2, '0')}
          </div>
        ))}
        <div className="h-[64px] snap-center" />
      </div>
      <span className="text-sm font-semibold text-muted-foreground mt-2 uppercase tracking-widest">{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StudySession({ user }: { user: AuthUser }) {
  const { settings, updateSettings } = usePomodoro()
  const { setTargetDuration } = useFocus()
  const router = useRouter()

  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSavePomodoro = () => {
    updateSettings(localSettings)
  }

  const handleResetPomodoro = () => {
    setLocalSettings(DEFAULT_POMODORO_SETTINGS)
    updateSettings(DEFAULT_POMODORO_SETTINGS)
  }

  const [selectedHours, setSelectedHours] = useState(0)
  const [selectedMinutes, setSelectedMinutes] = useState(settings.studyDuration)

  const handleStart = () => {
    if (selectedHours === 0 && selectedMinutes === 0) return
    const totalSeconds = (selectedHours * 3600) + (selectedMinutes * 60)
    setTargetDuration(totalSeconds)
    router.push("/dashboard/focus")
  }

  const handleReset = () => {
    setSelectedHours(0)
    setSelectedMinutes(settings.studyDuration)
  }

  const handleQuickStart = (minutes: number) => {
    setTargetDuration(minutes * 60)
    router.push("/dashboard/focus")
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Study Session</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Set a timer and launch the AI-powered focus tracker
        </p>
      </div>

      <MusicPromptBanner />

      <div className="animate-in fade-in duration-300 space-y-8">
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border">
                <Zap size={16} className="text-yellow-500" />
                <span className="text-sm font-semibold">Focus Mode</span>
              </div>

              <div className="relative">
                <div className="absolute top-[64px] left-0 right-0 h-[64px] bg-primary/5 rounded-2xl pointer-events-none border-y border-primary/10" />
                <div className="flex items-center justify-center font-mono">
                  <WheelPicker value={selectedHours} onChange={setSelectedHours} max={12} label="Hr" />
                  <span className="text-4xl text-primary font-bold -mt-8 animate-pulse">:</span>
                  <WheelPicker value={selectedMinutes} onChange={setSelectedMinutes} max={59} label="Min" />
                </div>
              </div>

              <div className="flex gap-4 flex-wrap justify-center">
                <Button size="lg" onClick={handleStart} disabled={selectedHours === 0 && selectedMinutes === 0} className="gap-2 transition-all">
                  <Play size={20} />
                  Start Timer
                </Button>
                <Button size="lg" variant="outline" onClick={handleReset} className="gap-2 bg-transparent">
                  <RotateCcw size={20} />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg md:text-xl font-bold mb-4">Quick Start Presets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { duration: 15, label: "Quick Focus", desc: "15 min" },
              { duration: 25, label: "Standard Pomodoro", desc: "25 min" },
              { duration: 45, label: "Extended Session", desc: "45 min" },
              { duration: 90, label: "Deep Work", desc: "90 min" },
            ].map((preset) => (
              <Button key={preset.duration} variant="outline" onClick={() => handleQuickStart(preset.duration)} className="h-auto flex flex-col items-start p-4 justify-start gap-2 hover:bg-primary/10">
                <span className="font-semibold">{preset.label}</span>
                <span className="text-xs text-muted-foreground">{preset.desc}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Pomodoro Settings */}
        <Card className="bg-card border-border mt-8">
          <CardHeader className="flex items-center justify-between flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍅</span>
              <CardTitle>Pomodoro &amp; Breaks Settings</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleResetPomodoro} className="h-8 gap-1.5 text-muted-foreground border border-border">
              <RefreshCcw size={14} />
              Reset Defaults
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium">Study Duration (mins)</label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={localSettings.studyDuration}
                  onChange={(e) => setLocalSettings({ ...localSettings, studyDuration: Number(e.target.value) })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Default Pomodoro session length.</p>
              </div>
              <div>
                <label className="text-sm font-medium">Short Break (mins)</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={localSettings.shortBreakDuration}
                  onChange={(e) => setLocalSettings({ ...localSettings, shortBreakDuration: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Long Break (mins)</label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={localSettings.longBreakDuration}
                  onChange={(e) => setLocalSettings({ ...localSettings, longBreakDuration: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1 pt-4 border-t border-border mt-2">
                <label className="text-sm font-medium text-emerald-500">Long Session Threshold</label>
                <Input
                  type="number"
                  min={10}
                  max={240}
                  value={localSettings.longSessionThreshold}
                  onChange={(e) => setLocalSettings({ ...localSettings, longSessionThreshold: Number(e.target.value) })}
                  className="mt-1 border-emerald-500/30"
                />
                <p className="text-xs text-muted-foreground mt-1">Force a break if a continuous session passes this limit (Rule 1).</p>
              </div>
              <div className="pt-4 border-t border-border mt-2">
                <label className="text-sm font-medium text-orange-500">Rapid Session Length</label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={localSettings.rapidSessionLength}
                  onChange={(e) => setLocalSettings({ ...localSettings, rapidSessionLength: Number(e.target.value) })}
                  className="mt-1 border-orange-500/30"
                />
                <p className="text-xs text-muted-foreground mt-1">2 uninterrupted rapid sessions trigger a break (Rule 2).</p>
              </div>
              <div className="pt-4 border-t border-border mt-2">
                <label className="text-sm font-medium text-purple-500">Sessions Before Long Break</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={localSettings.sessionsBeforeLongBreak}
                  onChange={(e) => setLocalSettings({ ...localSettings, sessionsBeforeLongBreak: Number(e.target.value) })}
                  className="mt-1 border-purple-500/30"
                />
                <p className="text-xs text-muted-foreground mt-1">How many standard sessions required to earn a long break.</p>
              </div>
            </div>
            <Button onClick={handleSavePomodoro} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              Save Timer Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
