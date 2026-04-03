import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

export function useStudySessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Initial fetch
  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      if (!error && data) {
        setSessions(data)
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('flowlock_sessions', JSON.stringify(data))
        }
      } else {
        // fallback to cache
        if (typeof localStorage !== 'undefined') {
          const cached = localStorage.getItem('flowlock_sessions')
          if (cached) setSessions(JSON.parse(cached))
        }
      }
      setLoading(false)
    }

    load()
  }, [user?.id])

  // Realtime subscription — auto updates sessions when ANY insert happens
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`study_sessions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[REALTIME] New session received:', payload.new)
          setSessions((prev) => {
            const updated = [payload.new, ...prev]
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('flowlock_sessions', JSON.stringify(updated))
            }
            return updated
          })
        }
      )
      .subscribe((status) => {
        console.log('[REALTIME] Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return { sessions, loading }
}
