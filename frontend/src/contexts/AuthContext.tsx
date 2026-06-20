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
  const popupRef = useRef<Window | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      // The opener always has permission to close its child popup, even after the popup
      // visited cross-origin pages (Google, Supabase). Calling window.close() from
      // *inside* the popup is blocked by Chrome in that case — so we close from here.
      if (session && popupRef.current && !popupRef.current.closed) {
        try { popupRef.current.close() } catch (_) {}
        popupRef.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function openPopup(url: string) {
    const w = 500, h = 650
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2)
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
    const popup = window.open(url, 'indelify-auth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`)
    if (!popup) {
      window.location.href = url  // fallback: popup blocked by browser
    } else {
      popupRef.current = popup
    }
  }

  async function signInWithSpotify() {
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes: 'user-read-email user-read-private playlist-modify-public playlist-modify-private',
        redirectTo: window.location.origin + '/auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (data?.url) openPopup(data.url)
  }

  async function signInWithGoogle() {
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (data?.url) openPopup(data.url)
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
