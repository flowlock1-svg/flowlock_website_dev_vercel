"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/utils/supabase/client"

export type GoogleProvider = 'calendar' | 'youtube'

export interface GoogleUser {
  id: string
  name: string
  email: string
  picture: string
}

export interface YouTubePlaylist {
  id: string
  snippet: {
    title: string
    description: string
    thumbnails: { default: { url: string }, medium: { url: string }, high: { url: string } }
  }
}

export interface YouTubeTrack {
  id: { videoId: string } | string
  snippet: {
    title: string
    channelTitle: string
    thumbnails: { default: { url: string }, medium: { url: string } }
    resourceId?: { videoId: string }
  }
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink: string
}

export function useGoogle(provider: GoogleProvider) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [user, setUser] = useState<GoogleUser | null>(null)
  
  // Provider-specific data
  const [ytPlaylists, setYtPlaylists] = useState<YouTubePlaylist[]>([])
  const [ytPlaylistsLoading, setYtPlaylistsLoading] = useState(false)
  
  const fetchedRef = useRef(false) // prevent double-fetch on StrictMode

  // --- Low-level: Retrieve Active Token from secure backend ---
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      
      const res = await fetch(`/api/${provider}/token`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
      
      if (!res.ok) return null
      const data = await res.json()
      return data.access_token || null
    } catch {
      return null
    }
  }, [provider])

  // --- Low-level: Call Google API ---
  const callGoogle = useCallback(async (endpoint: string, options: RequestInit = {}): Promise<any | null> => {
    const token = await getToken()
    if (!token) {
      console.warn(`[Google ${provider}] No valid token for`, endpoint)
      return null
    }
    
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    }

    const res = await fetch(endpoint, { ...options, headers })
    if (!res.ok) {
      const errText = await res.text()
      try {
        const errObj = JSON.parse(errText)
        if (errObj.error?.status === 'UNAUTHENTICATED' || errObj.error?.code === 401) {
          // Token might be revoked on Google's side, force logout state
          setIsLoggedIn(false)
        }
      } catch (e) {}
      console.error(`[Google ${provider}] API error`, res.status, endpoint)
      return null
    }
    
    // Some endpoints return 204 No Content
    if (res.status === 204) return true
    
    return res.json()
  }, [getToken, provider])

  // --- Initialise session ---
  useEffect(() => {
    let active = true

    const init = async () => {
      setIsLoading(true)

      // 1. Check if we just returned from OAuth callback
      const params = new URLSearchParams(window.location.search)
      const connectedProvider = params.get("connected")
      const errParam = params.get("error")

      if (connectedProvider === `google_${provider}`) {
        // Clean URL
        const url = new URL(window.location.href)
        url.searchParams.delete("connected")
        window.history.replaceState({}, "", url.toString())
        if (active) setIsLoggedIn(true)
      } else if (errParam) {
        console.error(`[Google ${provider}] OAuth error:`, errParam)
        const url = new URL(window.location.href)
        url.searchParams.delete("error")
        window.history.replaceState({}, "", url.toString())
      }

      // 2. Poll Database for Token
      const token = await getToken()
      if (token && active) {
        setIsLoggedIn(true)
      }
      
      if (active) setIsLoading(false)
    }
    
    init()
    
    return () => { active = false }
  }, [provider, getToken])

  // --- Fetch Initial Data after Login ---
  useEffect(() => {
    if (!isLoggedIn) return
    if (fetchedRef.current) return
    fetchedRef.current = true

    // Only YouTube usually requires full profile logic right away on FlowLock, but we can do it for both if wanted
    if (provider === 'youtube') {
      const loadYt = async () => {
        setYtPlaylistsLoading(true)
        const data = await callGoogle("https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50")
        if (data?.items) {
          setYtPlaylists(data.items)
        } else {
          setYtPlaylists([])
        }
        setYtPlaylistsLoading(false)
      }
      loadYt()
    }
  }, [isLoggedIn, provider, callGoogle])

  // --- Login / Flow Generation ---
  const login = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      alert("You must be logged into FlowLock to connect Google.")
      return
    }
    window.location.href = `/api/${provider}/auth?user_id=${session.user.id}`
  }, [provider])

  // --- Disconnect Backend ---
  const logout = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await fetch(`/api/${provider}/disconnect`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
    }
    setIsLoggedIn(false)
    setUser(null)
    setYtPlaylists([])
    fetchedRef.current = false
  }, [provider])

  // --- YouTube Methods ---
  const fetchYtPlaylists = useCallback(async (): Promise<YouTubePlaylist[]> => {
    setYtPlaylistsLoading(true)
    const data = await callGoogle("https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50")
    const items: YouTubePlaylist[] = data?.items ?? []
    if (items.length > 0) {
      setYtPlaylists(items)
    }
    setYtPlaylistsLoading(false)
    return items
  }, [callGoogle])
  
  const getYtPlaylistItems = useCallback(async (playlistId: string): Promise<YouTubeTrack[]> => {
    const data = await callGoogle(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}`)
    return data?.items ?? []
  }, [callGoogle])

  const searchYouTube = useCallback(async (query: string): Promise<YouTubeTrack[]> => {
    if (!query.trim()) return []
    const data = await callGoogle(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video`)
    return data?.items ?? []
  }, [callGoogle])
  
  // --- Calendar Methods ---
  const fetchCalendarEvents = useCallback(async (timeMin: Date = new Date(), maxResults: number = 20): Promise<CalendarEvent[]> => {
    const timeStr = timeMin.toISOString()
    const data = await callGoogle(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeStr)}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`)
    return data?.items ?? []
  }, [callGoogle])
  
  const createCalendarEvent = useCallback(async (summary: string, description: string, startTime: Date, endTime: Date): Promise<CalendarEvent | null> => {
    const event = {
      summary,
      description,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    }
    return callGoogle("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify(event)
    })
  }, [callGoogle])

  return {
    isLoggedIn,
    isLoading,
    user,
    login,
    logout,
    
    // YouTube
    ytPlaylists,
    ytPlaylistsLoading,
    fetchYtPlaylists,
    getYtPlaylistItems,
    searchYouTube,
    
    // Calendar
    fetchCalendarEvents,
    createCalendarEvent,
  }
}
