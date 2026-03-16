import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST() {
    try {
        // Attempt to open ActivityWatch using macOS open command.
        // It's typically installed in /Applications/ActivityWatch.app
        // It will silently succeed if it's already running, or start it if not.
        
        await execAsync('open -a ActivityWatch || open "/Applications/ActivityWatch.app"')

        return NextResponse.json({ success: true, message: "ActivityWatch starting..." })
    } catch (error: any) {
        console.error("Failed to start ActivityWatch:", error)
        return NextResponse.json(
            { success: false, error: "Failed to start ActivityWatch automatically. Please start it manually." },
            { status: 500 }
        )
    }
}
