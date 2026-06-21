import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// BroadcastChannel is NOT affected by COOP — it works between same-origin
// windows regardless of the opener/popup relationship.
// window.opener.postMessage IS blocked by COOP (Google sets same-origin COOP
// on their auth pages, severing the opener chain for the popup).
const CHANNEL = 'indelify-oauth'

function sendToMainWindow(payload: Record<string, unknown>) {
  try {
    const ch = new BroadcastChannel(CHANNEL)
    ch.postMessage(payload)
    ch.close()
  } catch (_) {}
  if (window.opener && typeof window.opener.postMessage === 'function') {
    try { window.opener.postMessage(payload, window.location.origin) } catch (_) {}
  }
}

export default function Callback() {
  const handled = useRef(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    function finish(session: unknown, error?: string) {
      if (handled.current) return
      handled.current = true

      if (session) {
        sendToMainWindow({ type: 'OAUTH_SUCCESS', session })
      } else {
        sendToMainWindow({ type: 'OAUTH_ERROR', error: error ?? 'Auth failed' })
      }

      setDone(true)

      // Give BroadcastChannel 800ms to reach the main window, then navigate
      // the popup back to the app. window.close() is unreliable on Firefox
      // after cross-origin OAuth redirects break the opener chain — navigating
      // is the only cross-browser exit that always works.
      setTimeout(() => {
        window.location.href = window.location.origin
      }, 800)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) finish(session)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) finish(data.session)
      else if (error) finish(null, error.message)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (done) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#100A0D', color: '#F5EEF0',
        fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: 16,
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, color: '#F4845F' }}>✦</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Signed in!</div>
        <div style={{ fontSize: 13, color: 'rgba(245,238,240,0.5)', lineHeight: 1.6 }}>
          Taking you back…
        </div>
        <button
          onClick={() => { window.location.href = window.location.origin }}
          style={{
            marginTop: 8, cursor: 'pointer',
            background: '#F4845F', border: 'none', borderRadius: 10,
            padding: '11px 28px', color: '#100A0D',
            fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif",
          }}
        >
          Go now
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#100A0D',
      fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        width: 28, height: 28,
        border: '2px solid #F4845F', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 14, color: 'rgba(245,238,240,0.55)' }}>Signing you in…</span>
    </div>
  )
}
