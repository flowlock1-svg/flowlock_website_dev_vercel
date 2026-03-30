import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  const { provider } = await params
  
  // Validation
  if (provider !== 'calendar' && provider !== 'youtube') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const authHeader = request.headers.get("Authorization")
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  
  const supabaseAuthClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } }
  })

  // Get User from JWT
  const { data: { user }, error: authErr } = await supabaseAuthClient.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerName = provider === 'calendar' ? 'google_calendar' : 'google_youtube'

  // Delete from user_integrations
  const { error: dbErr } = await supabaseAuthClient
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', providerName)

  if (dbErr) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
