  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
  import { Resend } from 'https://esm.sh/resend'

  const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  Deno.serve(async (req) => {
    try {
      // Get all users with email reports enabled
      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('user_id, timezone')
        .eq('email_reports_enabled', true)

      if (prefError) throw prefError

      const results = []

      for (const pref of preferences) {
        try {
          // Get user email from auth.users
          const { data: { user }, error: userError } = 
            await supabase.auth.admin.getUserById(pref.user_id)
          
          if (userError || !user?.email) continue

          // Get today's sessions for this user
          const today = new Date()
          const startOfDay = new Date(today)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(today)
          endOfDay.setHours(23, 59, 59, 999)

          const { data: sessions, error: sessionError } = await supabase
            .from('study_sessions')
            .select('*')
            .eq('user_id', pref.user_id)
            .gte('started_at', startOfDay.toISOString())
            .lte('started_at', endOfDay.toISOString())
            .order('started_at', { ascending: true })

          if (sessionError) continue

          // Skip users with no sessions today
          if (!sessions || sessions.length === 0) continue

          // Compute stats
          const totalSessions = sessions.length
          const totalFocusedMs = sessions.reduce(
            (s, r) => s + (r.focused_time_ms ?? 0), 0
          )
          const avgFocusScore = Math.round(
            sessions.reduce((s, r) => s + r.focus_score, 0) / totalSessions
          )
          const totalDistractions = sessions.reduce(
            (s, r) => s + (r.drowsy_count ?? 0) + 
            (r.head_turned_count ?? 0) + (r.face_missing_count ?? 0) + 
            (r.unauthorized_count ?? 0) + (r.high_noise_count ?? 0), 0
          )
          const bestSession = sessions.reduce(
            (best, s) => s.focus_score > best.focus_score ? s : best
          )

          const totalHours = Math.floor(totalFocusedMs / 3600000)
          const totalMins = Math.floor((totalFocusedMs % 3600000) / 60000)
          const totalTimeStr = totalHours > 0 
            ? `${totalHours}h ${totalMins}m` 
            : `${totalMins}m`

          const userName = user.user_metadata?.full_name || 
                          user.email.split('@')[0] || 'there'

          // Send email
          const { error: emailError } = await resend.emails.send({
            from: Deno.env.get('RESEND_FROM_EMAIL') || 
                  'onboarding@resend.dev',
            to: user.email,
            subject: `Your FlowLock Daily Report — ${
              new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })
            }`,
            html: generateEmailHTML({
              userName,
              totalSessions,
              totalTimeStr,
              avgFocusScore,
              totalDistractions,
              bestScore: bestSession.focus_score,
              sessions
            })
          })

          if (emailError) {
            console.error(`Email failed for ${user.email}:`, emailError)
          } else {
            results.push({ email: user.email, status: 'sent' })
          }

        } catch (userErr) {
          console.error('Error processing user:', pref.user_id, userErr)
        }
      }

      return new Response(
        JSON.stringify({ success: true, sent: results.length, results }),
        { headers: { 'Content-Type': 'application/json' } }
      )

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  })

  function generateEmailHTML({ 
    userName, totalSessions, totalTimeStr, 
    avgFocusScore, totalDistractions, bestScore, sessions 
  }: any) {
    const scoreColor = avgFocusScore >= 75 ? '#10b981' : 
                      avgFocusScore >= 50 ? '#f59e0b' : '#ef4444'
    
    const sessionRows = sessions.map((s: any) => {
      const duration = Math.round(s.duration_ms / 60000)
      const time = new Date(s.started_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      })
      return `
        <tr style="border-bottom: 1px solid #27272a;">
          <td style="padding: 10px; color: #a1a1aa;">${time}</td>
          <td style="padding: 10px; color: #fff;">${duration} min</td>
          <td style="padding: 10px; color: ${
            s.focus_score >= 75 ? '#10b981' : 
            s.focus_score >= 50 ? '#f59e0b' : '#ef4444'
          }; font-weight: 600;">${s.focus_score}%</td>
        </tr>
      `
    }).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="background: #09090b; color: #fff; font-family: -apple-system, sans-serif; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <div style="text-align: center; padding: 40px 0 30px;">
            <h1 style="color: #a855f7; font-size: 28px; margin: 0;">FlowLock</h1>
            <p style="color: #71717a; margin: 8px 0 0;">Daily Productivity Report</p>
          </div>

          <!-- Greeting -->
          <div style="background: #18181b; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #27272a;">
            <h2 style="margin: 0 0 8px; font-size: 22px;">
              Great work today, ${userName}! 🎯
            </h2>
            <p style="color: #71717a; margin: 0;">
              Here is your productivity summary for today.
            </p>
          </div>

          <!-- Stats Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            
            <div style="background: #18181b; border-radius: 12px; padding: 20px; border: 1px solid #27272a; text-align: center;">
              <p style="color: #71717a; margin: 0 0 8px; font-size: 13px;">TOTAL FOCUS TIME</p>
              <p style="color: #10b981; font-size: 28px; font-weight: 700; margin: 0;">${totalTimeStr}</p>
              <p style="color: #71717a; margin: 4px 0 0; font-size: 12px;">${totalSessions} sessions</p>
            </div>

            <div style="background: #18181b; border-radius: 12px; padding: 20px; border: 1px solid #27272a; text-align: center;">
              <p style="color: #71717a; margin: 0 0 8px; font-size: 13px;">AVG FOCUS SCORE</p>
              <p style="color: ${scoreColor}; font-size: 28px; font-weight: 700; margin: 0;">${avgFocusScore}%</p>
              <p style="color: #71717a; margin: 4px 0 0; font-size: 12px;">Best: ${bestScore}%</p>
            </div>

            <div style="background: #18181b; border-radius: 12px; padding: 20px; border: 1px solid #27272a; text-align: center;">
              <p style="color: #71717a; margin: 0 0 8px; font-size: 13px;">DISTRACTIONS</p>
              <p style="color: ${totalDistractions === 0 ? '#10b981' : '#f59e0b'}; font-size: 28px; font-weight: 700; margin: 0;">${totalDistractions}</p>
              <p style="color: #71717a; margin: 4px 0 0; font-size: 12px;">
                ${totalDistractions === 0 ? 'Perfect focus! 🔥' : 'total events'}
              </p>
            </div>

            <div style="background: #18181b; border-radius: 12px; padding: 20px; border: 1px solid #27272a; text-align: center;">
              <p style="color: #71717a; margin: 0 0 8px; font-size: 13px;">SESSIONS</p>
              <p style="color: #a855f7; font-size: 28px; font-weight: 700; margin: 0;">${totalSessions}</p>
              <p style="color: #71717a; margin: 4px 0 0; font-size: 12px;">completed today</p>
            </div>

          </div>

          <!-- Session Breakdown -->
          <div style="background: #18181b; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #27272a;">
            <h3 style="margin: 0 0 16px; color: #fff;">Session Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #27272a;">
                  <th style="padding: 8px 10px; color: #71717a; text-align: left; font-size: 12px;">TIME</th>
                  <th style="padding: 8px 10px; color: #71717a; text-align: left; font-size: 12px;">DURATION</th>
                  <th style="padding: 8px 10px; color: #71717a; text-align: left; font-size: 12px;">SCORE</th>
                </tr>
              </thead>
              <tbody>${sessionRows}</tbody>
            </table>
          </div>

          <!-- Motivational Message -->
          <div style="background: linear-gradient(135deg, #a855f720, #6366f120); border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #a855f730; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #d4d4d8;">
              ${avgFocusScore >= 80 
                ? "🏆 Outstanding performance! You're in the zone. Keep it up tomorrow!" 
                : avgFocusScore >= 60 
                ? "💪 Solid effort today! A little more focus tomorrow and you'll crush it!"
                : "🚀 Every session counts. Tomorrow is a fresh start — you've got this!"}
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #27272a;">
            <p style="color: #52525b; font-size: 12px; margin: 0;">
              You are receiving this because you enabled daily reports in FlowLock.
            </p>
            <p style="color: #52525b; font-size: 12px; margin: 8px 0 0;">
              To unsubscribe, go to FlowLock → Settings → Email Preferences
            </p>
          </div>

        </div>
      </body>
      </html>
    `
  }
