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
      // Close from the opener — it always has permission regardless of where
      // the popup navigated (Google, Supabase, back to our origin).
      if (session && popupRef.current && !popupRef.current.closed) {
        try { popupRef.current.close() } catch (_) {}
        popupRef.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Open about:blank SYNCHRONOUSLY (within the user-gesture window) so the
  // browser doesn't block it. We navigate it to the real OAuth URL afterward.
  function openBlankPopup(): Window | null {
    const w = 500, h = 650
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2)
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
    return window.open('about:blank', 'indelify-auth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`)
  }

  async function signInWithGoogle() {
    const popup = openBlankPopup()   // sync — must happen before any await
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
      } else {
        window.location.href = data.url   // last-resort: popup was blocked
      }
    } else {
      popup?.close()
    }
  }

  async function signInWithSpotify() {
    const popup = openBlankPopup()   // sync — must happen before any await
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
