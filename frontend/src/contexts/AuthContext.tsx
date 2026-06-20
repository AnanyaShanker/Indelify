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

const POPUP_DONE_KEY = 'indelify-popup-auth-done'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const popupRef = useRef<Window | null>(null)

  function closePopup() {
    if (popupRef.current && !popupRef.current.closed) {
      try { popupRef.current.close() } catch (_) {}
    }
    popupRef.current = null
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) closePopup()
    })

    // Direct localStorage watcher — fires the instant the popup writes its session.
    // This is more reliable than waiting for Supabase's internal BroadcastChannel.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === POPUP_DONE_KEY && e.newValue) closePopup()
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  function openBlankPopup(): Window | null {
    const w = 500, h = 650
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2)
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
    return window.open('about:blank', 'indelify-auth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`)
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
      if (popup) { popup.location.href = data.url; popupRef.current = popup }
      else window.location.href = data.url
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
      if (popup) { popup.location.href = data.url; popupRef.current = popup }
      else window.location.href = data.url
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
