"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Play, Square, RotateCcw, AlertTriangle, CheckCircle2, Download } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import Script from "next/script"
import type { FaceLandmarker as FaceLandmarkerType } from "@mediapipe/tasks-vision"

// Session result data passed to parent
export interface FocusSessionResult {
    score: number
    duration: number
    drowsyCount: number
    headTurnedCount: number
    faceMissingCount: number
    focusedTime: number
    drowsyTime: number
    headTurnedTime: number
    faceMissingTime: number
}

interface FocusTrackerProps {
    onSessionComplete?: (result: FocusSessionResult) => void
}

// Detection configuration
const CONFIG = {
    EAR_THRESHOLD: 0.20,
    HEAD_YAW_THRESHOLD: 25,
    BUFFER_TIME: 1000,
}

type DetectionStatus = "FOCUSED" | "DROWSY" | "HEAD_TURNED" | "FACE_MISSING"
type Phase = "ready" | "active" | "results"

export function FocusTracker({ onSessionComplete }: FocusTrackerProps) {
    const [phase, setPhase] = useState<Phase>("ready")
    const [chartLoaded, setChartLoaded] = useState(false)
    const [statusText, setStatusText] = useState("System Ready")
    const [statusType, setStatusType] = useState<"focused" | "warning" | "neutral">("neutral")
    const [metrics, setMetrics] = useState({
        status: "Focused",
        doze: "0.0s",
        face: "0.0s",
        head: "0.0s",
        ear: "0.00",
        yaw: "0°",
        duration: "00:00",
    })
    const [result, setResult] = useState<FocusSessionResult | null>(null)

    // Refs for mutable state that persists across frames
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
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const processDetectionRef = useRef<(faceLandmarks: any[], ctx: CanvasRenderingContext2D) => void>(() => { })

    // Detect already-loaded Chart.js script (e.g. after SPA navigation)
    useEffect(() => {
        if (typeof (window as any).Chart === "function") setChartLoaded(true)
    }, [])

    // EAR calculation
    // EAR — works with normalized landmarks (ratio is scale-invariant)
    const calculateEAR = useCallback((landmarks: any[], indices: number[]) => {
        const p = indices.map(i => landmarks[i])
        const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y)
        const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y)
        const h = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y)
        return (v1 + v2) / (2.0 * h)
    }, [])

    // Format milliseconds to mm:ss
    const formatTime = useCallback((ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60)
        const minutes = Math.floor((ms / (1000 * 60)) % 60)
        return `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
    }, [])

    // Update status banner
    const updateStatusUI = useCallback((message: string, type: "focused" | "warning" | "neutral") => {
        setStatusText(message)
        setStatusType(type)
        setMetrics((prev) => ({ ...prev, status: message }))
    }, [])

    // Update detection status with event tracking
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

    // Draw face mesh overlay — landmarks have normalized coords (0-1)
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

    // Process each detection frame — faceLandmarks from MediaPipe
    const processDetection = useCallback(
        (faceLandmarks: any[], ctx: CanvasRenderingContext2D) => {
            const now = Date.now()
            const delta = now - lastFrameTimeRef.current
            lastFrameTimeRef.current = now

            // No face detected
            if (!faceLandmarks || faceLandmarks.length === 0) {
                timersRef.current.faceMissing += delta

                if (timersRef.current.faceMissing > CONFIG.BUFFER_TIME) {
                    updateDetectionStatus("FACE_MISSING")
                }

                setMetrics((prev) => ({
                    ...prev,
                    ear: "0.00",
                    yaw: "0°",
                    doze: (timersRef.current.drowsy / 1000).toFixed(1) + "s",
                    face: (timersRef.current.faceMissing / 1000).toFixed(1) + "s",
                    head: (timersRef.current.headTurned / 1000).toFixed(1) + "s",
                }))
                return
            }

            // Face detected → reset faceMissing immediately
            timersRef.current.faceMissing = 0
            const landmarks = faceLandmarks[0] // first face's landmarks array

            drawMesh(landmarks, ctx)

            // EAR — normalized coords, ratio is scale-invariant
            const leftEAR = calculateEAR(landmarks, [33, 160, 158, 133, 153, 144])
            const rightEAR = calculateEAR(landmarks, [362, 385, 387, 263, 373, 380])
            const avgEAR = (leftEAR + rightEAR) / 2

            // Yaw — normalized coords (width cancels out)
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

            setMetrics((prev) => ({
                ...prev,
                ear: avgEAR.toFixed(2),
                yaw: Math.round(yaw) + "°",
                doze: (timersRef.current.drowsy / 1000).toFixed(1) + "s",
                face: (timersRef.current.faceMissing / 1000).toFixed(1) + "s",
                head: (timersRef.current.headTurned / 1000).toFixed(1) + "s",
            }))
        },
        [calculateEAR, drawMesh, updateDetectionStatus]
    )

    // Keep the ref always pointing to the latest processDetection
    useEffect(() => {
        processDetectionRef.current = processDetection
    }, [processDetection])

    // Detection loop — uses detectForVideo (synchronous) and ref for latest processDetection
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

    // Setup camera
    const setupCamera = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
            audio: false,
        })
        if (videoRef.current) {
            videoRef.current.srcObject = stream
            return new Promise<void>((resolve) => {
                videoRef.current!.onloadedmetadata = () => resolve()
            })
        }
    }, [])

    // Start session
    const handleStart = useCallback(async () => {
        try {
            setPhase("active")

            // Reset state
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
            await setupCamera()

            // Load MediaPipe FaceLandmarker model with GPU delegate
            if (!modelRef.current) {
                updateStatusUI("Loading AI Model... (This may take a moment)", "neutral")
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

            // Duration ticker
            durationIntervalRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current
                setMetrics((prev) => ({
                    ...prev,
                    duration: `${Math.floor(elapsed / 60000)
                        .toString()
                        .padStart(2, "0")}:${Math.floor((elapsed / 1000) % 60)
                            .toString()
                            .padStart(2, "0")}`,
                }))
            }, 1000)

            detectLoop()
        } catch (error: any) {
            console.error(error)
            updateStatusUI("Error: " + error.message, "warning")
        }
    }, [setupCamera, detectLoop, updateStatusUI])

    // Stop session
    const handleStop = useCallback(() => {
        isRunningRef.current = false
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)

        // Stop camera
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
            tracks.forEach((track) => track.stop())
            videoRef.current.srcObject = null
        }

        // Calculate results
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

        const sessionResult: FocusSessionResult = {
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

        setResult(sessionResult)
        setPhase("results")

        if (onSessionComplete) {
            onSessionComplete(sessionResult)
        }
    }, [onSessionComplete])

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
                    plugins: { legend: { position: "bottom" } },
                },
            })
        }
    }, [phase, result])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isRunningRef.current = false
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
            if (videoRef.current?.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
                tracks.forEach((track) => track.stop())
            }
            if (chartInstanceRef.current) chartInstanceRef.current.destroy()
        }
    }, [])

    const handleDownloadReport = useCallback(() => {
        if (!result) return
        const data = JSON.stringify(
            {
                score: result.score,
                duration: formatTime(result.duration),
                drowsyCount: result.drowsyCount,
                headTurnedCount: result.headTurnedCount,
                faceMissingCount: result.faceMissingCount,
                focusedTime: formatTime(result.focusedTime),
                drowsyTime: formatTime(result.drowsyTime),
                headTurnedTime: formatTime(result.headTurnedTime),
                faceMissingTime: formatTime(result.faceMissingTime),
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
    }, [result, formatTime])

    return (
        <>
            {/* Chart.js CDN — only dependency still loaded via script tag */}
            <Script
                src="https://cdn.jsdelivr.net/npm/chart.js"
                strategy="afterInteractive"
                onLoad={() => setChartLoaded(true)}
            />

            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
                        <Eye className="text-primary" size={28} />
                        Focus Tracker
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        AI-powered concentration monitoring using your webcam
                    </p>
                </div>

                {/* ── READY PHASE ── */}
                {phase === "ready" && (
                    <div className="animate-in fade-in duration-300">
                        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 max-w-2xl mx-auto">
                            <CardContent className="pt-8 pb-8 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                                        <Eye size={36} className="text-primary" />
                                    </div>
                                    <h2 className="text-xl font-bold">Real-time Concentration Detection</h2>
                                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                        Uses your webcam and AI-powered face detection to track your focus in real time. Everything runs locally in your browser.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                                    {[
                                        { icon: "👁️", label: "Detects drowsiness & eye closure" },
                                        { icon: "🔄", label: "Monitors head orientation" },
                                        { icon: "👤", label: "Tracks face presence" },
                                        { icon: "📊", label: "Real-time status updates" },
                                    ].map((f) => (
                                        <div key={f.label} className="flex items-center gap-2 text-sm bg-background/50 rounded-lg px-3 py-2">
                                            <span>{f.icon}</span>
                                            <span>{f.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="text-center space-y-2">
                                    <Button
                                        size="lg"
                                        onClick={handleStart}
                                        className="gap-2 text-base px-8"
                                    >
                                        <Play size={20} />
                                        Start Focus Session
                                    </Button>
                                </div>

                                <p className="text-xs text-muted-foreground text-center">
                                    🔒 All processing happens locally. No data is stored or transmitted.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── ACTIVE PHASE ── */}
                {phase === "active" && (
                    <div className="animate-in fade-in duration-300 space-y-6">
                        {/* Status banner */}
                        <div
                            className={`w-full py-4 px-6 text-center text-lg font-bold text-white rounded-xl transition-colors duration-500 ${statusType === "focused"
                                ? "bg-emerald-500"
                                : statusType === "warning"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                                }`}
                        >
                            {statusText}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Video feed */}
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
                                    </div>
                                </Card>
                            </div>

                            {/* Live metrics panel */}
                            <div>
                                <Card className="border-border">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Eye size={18} className="text-primary" />
                                            Live Metrics
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            { label: "Status", value: metrics.status, id: "status" },
                                            { label: "Doze Timer", value: metrics.doze, id: "doze" },
                                            { label: "Face Timer", value: metrics.face, id: "face" },
                                            { label: "Head Timer", value: metrics.head, id: "head" },
                                            { label: "EAR", value: metrics.ear, id: "ear" },
                                            { label: "Yaw", value: metrics.yaw, id: "yaw" },
                                            { label: "Duration", value: metrics.duration, id: "duration" },
                                        ].map((m) => (
                                            <div
                                                key={m.id}
                                                className="flex justify-between items-center px-3 py-2.5 bg-muted/50 rounded-lg text-sm font-medium"
                                            >
                                                <span className="text-muted-foreground">{m.label}</span>
                                                <span
                                                    className={
                                                        m.id === "status"
                                                            ? statusType === "focused"
                                                                ? "text-emerald-500"
                                                                : statusType === "warning"
                                                                    ? "text-red-500"
                                                                    : ""
                                                            : ""
                                                    }
                                                >
                                                    {m.value}
                                                </span>
                                            </div>
                                        ))}

                                        <Button
                                            variant="destructive"
                                            onClick={handleStop}
                                            className="w-full gap-2 mt-4"
                                            size="lg"
                                        >
                                            <Square size={18} />
                                            Stop Session
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── RESULTS PHASE ── */}
                {phase === "results" && result && (
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
                                    Session Duration: {formatTime(result.duration)}
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
                                            value: formatTime(result.focusedTime),
                                            pct: result.score + "%",
                                            color: "bg-emerald-500",
                                        },
                                        {
                                            label: "Drowsiness Events",
                                            value: `${result.drowsyCount} times (${formatTime(result.drowsyTime)})`,
                                            pct: "",
                                            color: "bg-amber-500",
                                        },
                                        {
                                            label: "Head Turned Events",
                                            value: `${result.headTurnedCount} times (${formatTime(result.headTurnedTime)})`,
                                            pct: "",
                                            color: "bg-red-500",
                                        },
                                        {
                                            label: "Face Not Detected",
                                            value: `${result.faceMissingCount} times (${formatTime(result.faceMissingTime)})`,
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
                                    <Button onClick={() => setPhase("ready")} className="gap-2">
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
                )}
            </div>
        </>
    )
}
