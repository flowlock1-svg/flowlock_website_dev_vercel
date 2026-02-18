"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Zap,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Download,
  Square,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import Script from "next/script"
import type { AuthUser } from "@/app/page"
import type { FocusSessionResult } from "./focus-tracker"
import type { FaceLandmarker as FaceLandmarkerType } from "@mediapipe/tasks-vision"

// Detection configuration
const CONFIG = {
  EAR_THRESHOLD: 0.2,
  HEAD_YAW_THRESHOLD: 25,
  BUFFER_TIME: 1000,
}

type DetectionStatus = "FOCUSED" | "DROWSY" | "HEAD_TURNED" | "FACE_MISSING"
type SessionPhase = "idle" | "active" | "paused" | "results"

interface StudySessionProps {
  user: AuthUser
  onSessionComplete?: (result: FocusSessionResult) => void
}

export function StudySession({ user, onSessionComplete }: StudySessionProps) {
  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [initialTime, setInitialTime] = useState(25 * 60)
  const [sessionMode, setSessionMode] = useState<"focus" | "break">("focus")
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [totalFocusTime, setTotalFocusTime] = useState(0)
  const [phase, setPhase] = useState<SessionPhase>("idle")

  // Script loading
  const [chartLoaded, setChartLoaded] = useState(false)

  // Focus detection state
  const [statusText, setStatusText] = useState("System Ready")
  const [statusType, setStatusType] = useState<"focused" | "warning" | "neutral">("neutral")
  const [metrics, setMetrics] = useState({
    ear: "0.00",
    yaw: "0°",
    doze: "0.0s",
    face: "0.0s",
    head: "0.0s",
  })
  const [result, setResult] = useState<FocusSessionResult | null>(null)

  // Detection refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartCanvasRef = useRef<HTMLCanvasElement>(null)
  const modelRef = useRef<FaceLandmarkerType | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const startTimeRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const timersRef = useRef({ drowsy: 0, faceMissing: 0, headTurned: 0 })
  const statsRef = useRef({ drowsyCount: 0, faceMissingCount: 0, headTurnedCount: 0 })
  const historyRef = useRef<Array<{ type: string; start: boolean; time: number }>>([])
  const currentStatusRef = useRef<DetectionStatus>("FOCUSED")
  const chartInstanceRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processDetectionRef = useRef<(predictions: any[], ctx: CanvasRenderingContext2D) => void>(() => { })

  // Detect already-loaded Chart.js script (e.g. after SPA navigation)
  useEffect(() => {
    if (typeof (window as any).Chart === "function") setChartLoaded(true)
  }, [])

  // ── Helper functions ──

  // EAR — works with normalized landmarks (ratio is scale-invariant)
  const calculateEAR = useCallback((landmarks: any[], indices: number[]) => {
    const p = indices.map(i => landmarks[i])
    const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y)
    const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y)
    const h = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y)
    return (v1 + v2) / (2.0 * h)
  }, [])

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatMs = useCallback((ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }, [])

  const updateStatusUI = useCallback((message: string, type: "focused" | "warning" | "neutral") => {
    setStatusText(message)
    setStatusType(type)
  }, [])

  const updateDetectionStatus = useCallback(
    (newStatus: DetectionStatus) => {
      if (currentStatusRef.current === newStatus) return
      const now = Date.now()

      if (currentStatusRef.current !== "FOCUSED") {
        historyRef.current.push({ type: currentStatusRef.current, start: false, time: now })
      }
      if (newStatus !== "FOCUSED") {
        historyRef.current.push({ type: newStatus, start: true, time: now })
        if (newStatus === "DROWSY") statsRef.current.drowsyCount++
        if (newStatus === "HEAD_TURNED") statsRef.current.headTurnedCount++
        if (newStatus === "FACE_MISSING") statsRef.current.faceMissingCount++
      }

      currentStatusRef.current = newStatus

      if (newStatus === "FOCUSED") {
        updateStatusUI("✓ Focused", "focused")
      } else if (newStatus === "DROWSY") {
        updateStatusUI("⚠ Distraction: Drowsiness", "warning")
      } else if (newStatus === "HEAD_TURNED") {
        updateStatusUI("⚠ Distraction: Head Turned Away", "warning")
      } else if (newStatus === "FACE_MISSING") {
        updateStatusUI("⚠ Distraction: Face Not In Frame", "warning")
      }
    },
    [updateStatusUI]
  )

  const drawMesh = useCallback((landmarks: any[], ctx: CanvasRenderingContext2D) => {
    if (!landmarks || !canvasRef.current) return
    const w = canvasRef.current.width
    const h = canvasRef.current.height
    ctx.fillStyle = "#10b981"
    for (let i = 0; i < landmarks.length; i += 10) {
      ctx.fillRect(landmarks[i].x * w, landmarks[i].y * h, 2, 2)
    }
    ctx.fillStyle = "cyan"
      ;[33, 133, 362, 263].forEach((idx) => {
        ctx.fillRect(landmarks[idx].x * w, landmarks[idx].y * h, 4, 4)
      })
    ctx.fillStyle = "red"
    ctx.fillRect(landmarks[1].x * w, landmarks[1].y * h, 5, 5)
  }, [])

  const processDetection = useCallback(
    (faceLandmarks: any[], ctx: CanvasRenderingContext2D) => {
      const now = Date.now()
      const delta = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now

      if (!faceLandmarks || faceLandmarks.length === 0) {
        timersRef.current.faceMissing += delta

        if (timersRef.current.faceMissing > CONFIG.BUFFER_TIME) {
          updateDetectionStatus("FACE_MISSING")
        }

        setMetrics({
          ear: "0.00",
          yaw: "0°",
          doze: (timersRef.current.drowsy / 1000).toFixed(1) + "s",
          face: (timersRef.current.faceMissing / 1000).toFixed(1) + "s",
          head: (timersRef.current.headTurned / 1000).toFixed(1) + "s",
        })
        return
      }

      // Face detected → reset faceMissing immediately
      timersRef.current.faceMissing = 0
      const landmarks = faceLandmarks[0] // first face's landmarks array

      drawMesh(landmarks, ctx)

      const leftEAR = calculateEAR(landmarks, [33, 160, 158, 133, 153, 144])
      const rightEAR = calculateEAR(landmarks, [362, 385, 387, 263, 373, 380])
      const avgEAR = (leftEAR + rightEAR) / 2

      const nose = landmarks[1]
      const midX = (landmarks[33].x + landmarks[263].x) / 2
      const yaw = (nose.x - midX) * 100 * 1.5

      // Update timers — immediate reset when condition clears
      if (avgEAR < CONFIG.EAR_THRESHOLD) {
        timersRef.current.drowsy += delta
      } else {
        timersRef.current.drowsy = 0
      }

      if (Math.abs(yaw) > CONFIG.HEAD_YAW_THRESHOLD) {
        timersRef.current.headTurned += delta
      } else {
        timersRef.current.headTurned = 0
      }

      // Determine status
      if (timersRef.current.drowsy > CONFIG.BUFFER_TIME) {
        updateDetectionStatus("DROWSY")
      } else if (timersRef.current.headTurned > CONFIG.BUFFER_TIME) {
        updateDetectionStatus("HEAD_TURNED")
      } else {
        updateDetectionStatus("FOCUSED")
      }

      setMetrics({
        ear: avgEAR.toFixed(2),
        yaw: Math.round(yaw) + "°",
        doze: (timersRef.current.drowsy / 1000).toFixed(1) + "s",
        face: (timersRef.current.faceMissing / 1000).toFixed(1) + "s",
        head: (timersRef.current.headTurned / 1000).toFixed(1) + "s",
      })
    },
    [calculateEAR, drawMesh, updateDetectionStatus]
  )

  // Keep the ref always pointing to the latest processDetection
  useEffect(() => {
    processDetectionRef.current = processDetection
  }, [processDetection])

  const detectLoop = useCallback(() => {
    if (!isRunningRef.current || !videoRef.current || !canvasRef.current || !modelRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    try {
      const results = modelRef.current.detectForVideo(videoRef.current, performance.now())

      if (!canvasRef.current) return
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      ctx.save()
      ctx.scale(-1, 1)
      ctx.translate(-canvasRef.current.width, 0)

      processDetectionRef.current(results.faceLandmarks, ctx)

      ctx.restore()
    } catch (e) {
      console.error("Detection frame error:", e)
    }

    animationIdRef.current = requestAnimationFrame(detectLoop)
  }, [])

  // ── Camera setup ──

  const setupCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    })
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      return new Promise<void>((resolve) => {
        videoRef.current!.onloadedmetadata = () => resolve()
      })
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // ── Calculate final results ──

  const calculateResults = useCallback(() => {
    const now = Date.now()
    const totalDuration = now - startTimeRef.current

    let drowsyDuration = 0
    let headDuration = 0
    let faceDuration = 0
    let lastEvent: any = null

    historyRef.current.forEach((e) => {
      if (e.start) {
        lastEvent = e
      } else if (lastEvent && lastEvent.type === e.type) {
        const dur = e.time - lastEvent.time
        if (e.type === "DROWSY") drowsyDuration += dur
        if (e.type === "HEAD_TURNED") headDuration += dur
        if (e.type === "FACE_MISSING") faceDuration += dur
        lastEvent = null
      }
    })

    if (lastEvent) {
      const dur = now - lastEvent.time
      if (lastEvent.type === "DROWSY") drowsyDuration += dur
      if (lastEvent.type === "HEAD_TURNED") headDuration += dur
      if (lastEvent.type === "FACE_MISSING") faceDuration += dur
    }

    const distractedTime = drowsyDuration + headDuration + faceDuration
    const focusedTime = Math.max(0, totalDuration - distractedTime)
    const score = Math.round((focusedTime / totalDuration) * 100) || 0

    return {
      score,
      duration: totalDuration,
      drowsyCount: statsRef.current.drowsyCount,
      headTurnedCount: statsRef.current.headTurnedCount,
      faceMissingCount: statsRef.current.faceMissingCount,
      focusedTime,
      drowsyTime: drowsyDuration,
      headTurnedTime: headDuration,
      faceMissingTime: faceDuration,
    }
  }, [])

  // ── Session controls ──

  const handleStart = useCallback(async () => {
    try {
      // Reset detection state
      timersRef.current = { drowsy: 0, faceMissing: 0, headTurned: 0 }
      statsRef.current = { drowsyCount: 0, faceMissingCount: 0, headTurnedCount: 0 }
      historyRef.current = []
      currentStatusRef.current = "FOCUSED"
      lastFrameTimeRef.current = Date.now()

      if (videoRef.current) {
        videoRef.current.width = 640
        videoRef.current.height = 480
      }
      if (canvasRef.current) {
        canvasRef.current.width = 640
        canvasRef.current.height = 480
      }

      updateStatusUI("Requesting Camera...", "neutral")
      setPhase("active")

      await setupCamera()

      // Load model if not loaded
      // Load MediaPipe FaceLandmarker model with GPU delegate
      if (!modelRef.current) {
        updateStatusUI("Loading AI Model...", "neutral")
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision")
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
        )
        modelRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numFaces: 1,
        })
      }

      isRunningRef.current = true
      startTimeRef.current = Date.now()
      updateStatusUI("✓ Focused", "focused")

      detectLoop()
    } catch (error: any) {
      console.error(error)
      updateStatusUI("Error: " + error.message, "warning")
    }
  }, [setupCamera, detectLoop, updateStatusUI])

  const handlePause = useCallback(() => {
    // Pause detection loop
    isRunningRef.current = false
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
    setPhase("paused")
    updateStatusUI("⏸ Session Paused", "neutral")
  }, [updateStatusUI])

  const handleResume = useCallback(() => {
    isRunningRef.current = true
    lastFrameTimeRef.current = Date.now()
    setPhase("active")
    updateStatusUI("✓ Focused", "focused")
    detectLoop()
  }, [detectLoop, updateStatusUI])

  const handleStop = useCallback(() => {
    isRunningRef.current = false
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
    stopCamera()

    const sessionResult = calculateResults()
    setResult(sessionResult)
    setPhase("results")
    setSessionsCompleted((prev) => prev + 1)
    setTotalFocusTime((prev) => prev + Math.floor(sessionResult.duration / 1000))

    if (onSessionComplete) {
      onSessionComplete(sessionResult)
    }
  }, [stopCamera, calculateResults, onSessionComplete])

  const handleReset = useCallback(() => {
    isRunningRef.current = false
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
    stopCamera()

    setPhase("idle")
    setTimeLeft(initialTime)
    setSessionMode("focus")
    updateStatusUI("System Ready", "neutral")
    setResult(null)
  }, [stopCamera, initialTime, updateStatusUI])

  const handleQuickStart = useCallback(
    (minutes: number) => {
      setTimeLeft(minutes * 60)
      setInitialTime(minutes * 60)
      setSessionMode("focus")
      // Delay start slightly so state updates propagate
      setTimeout(() => handleStart(), 50)
    },
    [handleStart]
  )

  const handleNewSession = useCallback(() => {
    setPhase("idle")
    setTimeLeft(initialTime)
    setSessionMode("focus")
    setResult(null)
    updateStatusUI("System Ready", "neutral")
  }, [initialTime, updateStatusUI])

  // ── Timer countdown (runs when active, not paused) ──

  useEffect(() => {
    if (phase !== "active") return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer ended — auto-stop session
          handleStop()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, handleStop])

  // Track total focus time while active
  useEffect(() => {
    if (phase === "active" && sessionMode === "focus") {
      const interval = setInterval(() => {
        setTotalFocusTime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [phase, sessionMode])

  // Render chart when results phase is entered
  useEffect(() => {
    if (phase === "results" && result && chartCanvasRef.current) {
      const Chart = (window as any).Chart
      if (!Chart) return

      if (chartInstanceRef.current) chartInstanceRef.current.destroy()

      const ctx = chartCanvasRef.current.getContext("2d")
      chartInstanceRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Focused", "Drowsy", "Head Turned", "Missing"],
          datasets: [
            {
              data: [result.focusedTime, result.drowsyTime, result.headTurnedTime, result.faceMissingTime],
              backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#6b7280"],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom", labels: { color: "#e5e7eb" } } },
        },
      })
    }
  }, [phase, result])

  // Cleanup
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      stopCamera()
      if (chartInstanceRef.current) chartInstanceRef.current.destroy()
    }
  }, [stopCamera])

  const handleDownloadReport = useCallback(() => {
    if (!result) return
    const data = JSON.stringify(
      {
        score: result.score,
        duration: formatMs(result.duration),
        drowsyCount: result.drowsyCount,
        headTurnedCount: result.headTurnedCount,
        faceMissingCount: result.faceMissingCount,
        focusedTime: formatMs(result.focusedTime),
        drowsyTime: formatMs(result.drowsyTime),
        headTurnedTime: formatMs(result.headTurnedTime),
        faceMissingTime: formatMs(result.faceMissingTime),
        history: historyRef.current,
      },
      null,
      2
    )
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "focus_report.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [result, formatMs])

  // Progress percentage for timer ring
  const progress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0

  return (
    <>
      {/* External Scripts — sequential loading */}
      {/* Chart.js CDN — only dependency still loaded via script tag */}
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
        onLoad={() => setChartLoaded(true)}
      />

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Study Session</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Focus timer paired with AI-powered concentration monitoring
          </p>
        </div>

        {/* ── IDLE: Timer + Start ── */}
        {phase === "idle" && (
          <div className="animate-in fade-in duration-300 space-y-8">
            <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
              <CardContent className="pt-12 pb-12">
                <div className="flex flex-col items-center justify-center space-y-8">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border">
                    <Zap size={16} className="text-yellow-500" />
                    <span className="text-sm font-semibold">Focus Mode</span>
                  </div>

                  {/* Timer display */}
                  <div className="text-7xl md:text-8xl font-bold font-mono text-primary tabular-nums">
                    {formatTimerDisplay(timeLeft)}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-4 flex-wrap justify-center">
                    <Button
                      size="lg"
                      onClick={handleStart}
                      className="gap-2"
                    >
                      <Play size={20} />
                      Start
                    </Button>
                    <Button size="lg" variant="outline" onClick={handleReset} className="gap-2 bg-transparent">
                      <RotateCcw size={20} />
                      Reset
                    </Button>
                  </div>

                  {/* Session info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-md">
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Sessions</p>
                      <p className="text-2xl font-bold">{sessionsCompleted}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Mode</p>
                      <p className="text-2xl font-bold capitalize">{sessionMode}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">Focus Time</p>
                      <p className="text-2xl font-bold">{Math.floor(totalFocusTime / 60)}m</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick start presets */}
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-4">Quick Start Presets</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { duration: 15, label: "Quick Focus", desc: "15 min" },
                  { duration: 25, label: "Standard Pomodoro", desc: "25 min" },
                  { duration: 45, label: "Extended Session", desc: "45 min" },
                  { duration: 90, label: "Deep Work", desc: "90 min" },
                ].map((preset) => (
                  <Button
                    key={preset.duration}
                    variant="outline"
                    onClick={() => handleQuickStart(preset.duration)}
                    className="h-auto flex flex-col items-start p-4 justify-start gap-2 hover:bg-primary/10"
                  >
                    <span className="font-semibold">{preset.label}</span>
                    <span className="text-xs text-muted-foreground">{preset.desc}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )
        }

        {/* ── ACTIVE / PAUSED: Timer + Camera Feed ── */}
        {
          (phase === "active" || phase === "paused") && (
            <div className="animate-in fade-in duration-300 space-y-6">
              {/* Status banner */}
              <div
                className={`w-full py-3 px-6 text-center text-lg font-bold text-white rounded-xl transition-colors duration-500 ${phase === "paused"
                  ? "bg-gray-500"
                  : statusType === "focused"
                    ? "bg-emerald-500"
                    : statusType === "warning"
                      ? "bg-red-500"
                      : "bg-gray-500"
                  }`}
              >
                {phase === "paused" ? "⏸ Session Paused" : statusText}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Camera feed */}
                <div className="lg:col-span-2">
                  <Card className="overflow-hidden border-border">
                    <div className="relative bg-black aspect-video">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="w-full h-full object-cover"
                        style={{ transform: "scaleX(-1)" }}
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ transform: "scaleX(-1)" }}
                      />

                      {/* Timer overlay on the video */}
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-3">
                        <Clock size={20} className="text-primary" />
                        <span className="text-3xl font-bold font-mono text-white tabular-nums">
                          {formatTimerDisplay(timeLeft)}
                        </span>
                      </div>

                      {/* Paused overlay */}
                      {phase === "paused" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <Pause size={48} className="text-white mx-auto" />
                            <p className="text-white text-xl font-bold">Paused</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Right: Metrics + Controls */}
                <div className="space-y-4">
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Eye size={18} className="text-primary" />
                        Live Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        { label: "Doze Timer", value: metrics.doze, id: "doze" },
                        { label: "Face Timer", value: metrics.face, id: "face" },
                        { label: "Head Timer", value: metrics.head, id: "head" },
                        { label: "EAR", value: metrics.ear, id: "ear" },
                        { label: "Yaw", value: metrics.yaw, id: "yaw" },
                      ].map((m) => (
                        <div
                          key={m.id}
                          className="flex justify-between items-center px-3 py-2 bg-muted/50 rounded-lg text-sm font-medium"
                        >
                          <span className="text-muted-foreground">{m.label}</span>
                          <span>{m.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Control buttons */}
                  <div className="flex flex-col gap-3">
                    {phase === "active" ? (
                      <Button
                        onClick={handlePause}
                        className="w-full gap-2"
                        variant="outline"
                        size="lg"
                      >
                        <Pause size={18} />
                        Pause
                      </Button>
                    ) : (
                      <Button
                        onClick={handleResume}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Play size={18} />
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={handleStop}
                      className="w-full gap-2"
                      size="lg"
                    >
                      <Square size={18} />
                      Stop Session
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="w-full gap-2 bg-transparent"
                      size="lg"
                    >
                      <RotateCcw size={18} />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* ── RESULTS ── */}
        {
          phase === "results" && result && (
            <div className="animate-in fade-in duration-300 space-y-6 max-w-2xl mx-auto">
              <Card className="border-border">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2">
                    {result.score >= 70 ? (
                      <CheckCircle2 size={48} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={48} className="text-amber-500" />
                    )}
                  </div>
                  <CardTitle className="text-3xl">
                    Focus Score:{" "}
                    <span className={result.score >= 70 ? "text-emerald-500" : "text-amber-500"}>
                      {result.score}%
                    </span>
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Session Duration: {formatMs(result.duration)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Chart */}
                  <div className="max-w-xs mx-auto">
                    <canvas ref={chartCanvasRef} />
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                      Session Breakdown
                    </h3>
                    {[
                      {
                        label: "Focused Time",
                        value: formatMs(result.focusedTime),
                        pct: result.score + "%",
                        color: "bg-emerald-500",
                      },
                      {
                        label: "Drowsiness Events",
                        value: `${result.drowsyCount} times (${formatMs(result.drowsyTime)})`,
                        pct: "",
                        color: "bg-amber-500",
                      },
                      {
                        label: "Head Turned Events",
                        value: `${result.headTurnedCount} times (${formatMs(result.headTurnedTime)})`,
                        pct: "",
                        color: "bg-red-500",
                      },
                      {
                        label: "Face Not Detected",
                        value: `${result.faceMissingCount} times (${formatMs(result.faceMissingTime)})`,
                        pct: "",
                        color: "bg-gray-500",
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 text-sm">
                        <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                        <span className="font-medium flex-1">{item.label}</span>
                        <span className="text-muted-foreground">{item.value}</span>
                        {item.pct && <span className="font-bold">{item.pct}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-center pt-2">
                    <Button onClick={handleNewSession} className="gap-2">
                      <RotateCcw size={18} />
                      New Session
                    </Button>
                    <Button variant="outline" onClick={handleDownloadReport} className="gap-2 bg-transparent">
                      <Download size={18} />
                      Download Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }

        {/* Session history (visible in idle and results) */}
        {
          (phase === "idle" || phase === "results") && (
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-4">Today&apos;s Sessions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock size={18} className="text-primary" />
                      Sessions Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{sessionsCompleted}</p>
                    <p className="text-sm text-muted-foreground mt-2">Keep up the pace!</p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap size={18} className="text-yellow-500" />
                      Total Focus Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{Math.floor(totalFocusTime / 60)}m</p>
                    <p className="text-sm text-muted-foreground mt-2">Well focused today!</p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye size={18} className="text-emerald-500" />
                      Last Focus Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{result ? result.score + "%" : "—"}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {result
                        ? result.score >= 70
                          ? "Great concentration!"
                          : "Room for improvement"
                        : "Start a session to track"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        }
      </div >
    </>
  )
}
