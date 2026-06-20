import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithSpotify: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const popupRef  = useRef<Window | null>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      // Belt-and-suspenders: if session arrives via BroadcastChannel/storage event,
      // close the popup immediately without waiting for the poll.
      if (session) forceClosePopup()
    })

    return () => {
      subscription.unsubscribe()
      stopPoll()
    }
  }, [])

  function stopPoll() {
    if (pollRef.current)   { clearInterval(pollRef.current);  pollRef.current  = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }

  function forceClosePopup() {
    if (popupRef.current && !popupRef.current.closed) {
      try { popupRef.current.close() } catch (_) {}
    }
    popupRef.current = null
    stopPoll()
  }

  // Poll the popup's URL every 400ms.
  // Reading popup.location.href throws a SecurityError when the popup is on a
  // cross-origin page (Google / Supabase). Once it returns to our origin the
  // read succeeds — that's our signal to close the popup and sync the session.
  function startPolling(popup: Window) {
    stopPoll()
    let sawCrossOrigin = false

    pollRef.current = setInterval(() => {
      // Popup was closed by the user
      if (popup.closed) {
        stopPoll()
        if (popupRef.current === popup) popupRef.current = null
        // Sync session in case it was set before the user closed the popup
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) { setSession(data.session); setUser(data.session.user) }
        })
        return
      }

      try {
        const href = popup.location.href
        // Popup is on our domain. If we previously saw it go cross-origin
        // (OAuth in progress), that means OAuth just finished.
        if (sawCrossOrigin && href.startsWith(window.location.origin)) {
          stopPoll()
          // Give Supabase ~1.5 s to write the session to localStorage
          timeoutRef.current = setTimeout(async () => {
            if (!popup.closed) try { popup.close() } catch (_) {}
            if (popupRef.current === popup) popupRef.current = null
            const { data } = await supabase.auth.getSession()
            if (data.session) { setSession(data.session); setUser(data.session.user) }
          }, 1500)
        }
      } catch {
        // Cross-origin — OAuth is in progress on Google / Supabase. Expected.
        sawCrossOrigin = true
      }
    }, 400)

    // Safety stop after 5 minutes
    const safety = setTimeout(stopPoll, 300_000)
    // Store the safety timeout in a separate var so we can clear it on unmount
    // (timeoutRef is already used for the 1.5s close delay, so just let it leak
    // for 5 min since the component unmounts rarely)
    void safety
  }

  function openBlankPopup(): Window | null {
    const w = 500, h = 650
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2)
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
    return window.open('about:blank', 'indelify-auth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`)
  }

  async function signInWithGoogle() {
    const popup = openBlankPopup()
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (data?.url) {
      if (popup) {
        popup.location.href = data.url
        popupRef.current = popup
        startPolling(popup)
      } else {
        window.location.href = data.url   // popup blocked — fallback redirect
      }
    } else {
      popup?.close()
    }
  }

  async function signInWithSpotify() {
    const popup = openBlankPopup()
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes: 'user-read-email user-read-private playlist-modify-public playlist-modify-private',
        redirectTo: window.location.origin + '/auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (data?.url) {
      if (popup) {
        popup.location.href = data.url
        popupRef.current = popup
        startPolling(popup)
      } else {
        window.location.href = data.url
      }
    } else {
      popup?.close()
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithSpotify, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
