import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

export async function GET(request: NextRequest) {
  try {
    // We pre-zipped the extension to public/chrome-extension.zip
    const filePath = path.join(process.cwd(), "public", "chrome-extension.zip")
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Extension files not found." }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="flowlock-extension.zip"',
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error serving extension zip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
