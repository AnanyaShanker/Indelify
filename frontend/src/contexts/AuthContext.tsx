import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  connecting: boolean   // true while an OAuth popup is open
  signInWithSpotify: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)
const OAUTH_CHANNEL = 'indelify-oauth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [session, setSession]     = useState<Session | null>(null)
  const [loading, setLoading]     = useState(true)
  const [connecting, setConnecting] = useState(false)

  const popupRef = useRef<Window | null>(null)
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- helpers ---
  function clearWatch() {
    if (watchRef.current) { clearInterval(watchRef.current); watchRef.current = null }
  }

  // Helper: safely read popup.closed without throwing.
  // COOP (Cross-Origin-Opener-Policy) set by Google/Supabase auth pages severs
  // the opener↔popup browsing-context-group, causing .closed reads to throw a
  // SecurityError. We catch that and assume NOT closed (popup handles itself).
  function isPopupClosed(popup: Window): boolean {
    try { return popup.closed } catch (_) { return false }
  }

  function closePopupAndReset(newSession?: Session | null) {
    if (newSession !== undefined) { setSession(newSession); setUser(newSession?.user ?? null) }
    if (popupRef.current) {
      // popup.close() from the opener is also blocked by COOP — the popup closes
      // itself via window.close() (or the "Close this tab" button) in Callback.tsx.
      try { popupRef.current.close() } catch (_) {}
    }
    popupRef.current = null
    clearWatch()
    setConnecting(false)
  }

  // Safety interval: if the user manually closes the popup before auth
  // completes, detect popup.closed and reset the connecting state.
  // Uses isPopupClosed() to avoid COOP SecurityErrors.
  function watchPopup(popup: Window) {
    clearWatch()
    watchRef.current = setInterval(() => {
      if (!isPopupClosed(popup)) return
      // Popup closed without auth completing
      if (popupRef.current === popup) {
        popupRef.current = null
        clearWatch()
        setConnecting(false)
      }
    }, 400)
    // Safety stop after 5 minutes
    setTimeout(clearWatch, 300_000)
  }

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Supabase BroadcastChannel / storage-event sync from other windows
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) {
        // Call closePopupAndReset AND also clear watch/connecting directly
        // as a safety net in case of stale closure.
        closePopupAndReset()
        clearWatch()
        setConnecting(false)
      }
    })

    // postMessage from Callback popup (window.opener.postMessage path)
    function handleMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'OAUTH_SUCCESS') closePopupAndReset(e.data.session as Session)
      if (e.data?.type === 'OAUTH_ERROR')   closePopupAndReset()
    }
    window.addEventListener('message', handleMessage)

    // BroadcastChannel fallback (when window.opener is null after cross-origin nav)
    const channel = new BroadcastChannel(OAUTH_CHANNEL)
    channel.onmessage = (e) => {
      if (e.data?.type === 'OAUTH_SUCCESS') closePopupAndReset(e.data.session as Session)
      if (e.data?.type === 'OAUTH_ERROR')   closePopupAndReset()
    }

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('message', handleMessage)
      channel.close()
      clearWatch()
    }
  }, [])

  function openBlankPopup(): Window | null {
    const w = 450, h = 730
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2)
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
    return window.open(
      'about:blank', 'indelify-auth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    )
  }

  async function signInWithGoogle() {
    const popup = openBlankPopup()
    setConnecting(true)

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
        watchPopup(popup)
      } else {
        // Popup blocked — fall back to redirecting the current tab
        window.location.href = data.url
        setConnecting(false)
      }
    } else {
      popup?.close()
      setConnecting(false)
    }
  }

  async function signInWithSpotify() {
    const popup = openBlankPopup()
    setConnecting(true)

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
        watchPopup(popup)
      } else {
        window.location.href = data.url
        setConnecting(false)
      }
    } else {
      popup?.close()
      setConnecting(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, connecting, signInWithSpotify, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
