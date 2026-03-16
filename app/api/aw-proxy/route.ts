import { NextRequest, NextResponse } from "next/server"

const AW_API = "http://localhost:5600/api/0"

export async function GET(req: NextRequest) {
    const endpoint = req.nextUrl.searchParams.get("endpoint") || "buckets"

    try {
        const resp = await fetch(`${AW_API}/${endpoint}`, {
            headers: { "Content-Type": "application/json" },
            // Server-side fetch — no CORS issues
            signal: AbortSignal.timeout(4000),
        })

        if (!resp.ok) {
            return NextResponse.json({ error: "AW returned error" }, { status: resp.status })
        }

        const data = await resp.json()
        return NextResponse.json(data)
    } catch {
        return NextResponse.json({ error: "ActivityWatch not reachable" }, { status: 503 })
    }
}
