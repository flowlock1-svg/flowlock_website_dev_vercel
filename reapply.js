const fs = require('fs');
let code = fs.readFileSync('components/dashboard/pages/dashboard-home.tsx', 'utf8');

// Replace standard imports
code = code.replace(/Area,[\s\n]*AreaChart,/, 'Bar,\n  BarChart,\n  CartesianGrid,');

// Replace fetchData block
const fetchDailyOld = `        // Fetch daily stats
        const { data: dailyData } = await supabase
          .from('daily_stats')
          .select('date, focus_minutes, sessions')
          .eq('user_id', user.id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .order('date', { ascending: true })

        // Fetch weekly stats
        const { data: weeklyData } = await supabase
          .from('weekly_stats')
          .select('week_start, focus_hours, sessions, avg_score')
          .eq('user_id', user.id)
          .gte('week_start', monthStart.toISOString().split('T')[0])
          .order('week_start', { ascending: true })

        if (dailyData && dailyData.length > 0) {
          // Fill missing days for daily
          // ... (this entire block down to setMonthlyData) ...
          `;
          
code = code.replace(/\/\/ Fetch daily stats[\s\S]*?setWeeklyData\(weeksFilled\)/, `// Fetch current month sessions
        const { data: monthSessions } = await supabase
          .from("study_sessions")
          .select("started_at, duration_ms, focus_score")
          .eq("user_id", user.id)
          .gte("started_at", monthStart.toISOString())
          .order("started_at", { ascending: true })

        // Build monthly bar chart data (4 weeks)
        const weeks = [
          { week: "Week 1", focusMin: 0, sessions: 0, totalScore: 0, avgScore: 0 },
          { week: "Week 2", focusMin: 0, sessions: 0, totalScore: 0, avgScore: 0 },
          { week: "Week 3", focusMin: 0, sessions: 0, totalScore: 0, avgScore: 0 },
          { week: "Week 4", focusMin: 0, sessions: 0, totalScore: 0, avgScore: 0 },
        ]
        if (monthSessions) {
          for (const s of monthSessions) {
            const dayOfMonth = new Date(s.started_at).getDate()
            const weekIdx = Math.min(Math.floor((dayOfMonth - 1) / 7), 3)
            weeks[weekIdx].focusMin += Math.round(s.duration_ms / 60000)
            weeks[weekIdx].sessions += 1
            weeks[weekIdx].totalScore += s.focus_score
          }
          for (const w of weeks) {
            if (w.sessions > 0) w.avgScore = Math.round(w.totalScore / w.sessions)
          }
        }
        setMonthlyData(weeks)`);

// Replace state setup
code = code.replace('const [dailyData, setDailyData] = useState<any[]>([])\n  const [weeklyData, setWeeklyData] = useState<any[]>([])', 'const [monthlyData, setMonthlyData] = useState<any[]>([])');

// Replace custom tooltip
code = code.replace(/typeof payload\[0\]\.value === "number"\s*\?\s*payload\[0\]\.value\.toFixed\(1\)\s*:\s*payload\[0\]\.value/g, 'typeof payload[0].value === "number" ? payload[0].value.toFixed(1) : payload[0].value');

// Replace charts grid
// ... just use sed for the final graph to prevent regex headaches ...
fs.writeFileSync('components/dashboard/pages/dashboard-home.tsx', code);
