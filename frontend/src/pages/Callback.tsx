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
  // Also try postMessage in case opener is still available (non-Google flows)
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

      console.log('[Callback] Auth complete. Session:', !!session)

      if (session) {
        sendToMainWindow({ type: 'OAUTH_SUCCESS', session })
      } else {
        sendToMainWindow({ type: 'OAUTH_ERROR', error: error ?? 'Auth failed' })
      }

      // Attempt an immediate close. Due to COOP (Google sets Cross-Origin-Opener-Policy:
      // same-origin on their auth pages), Chrome may defer this close until the user
      // interacts with the popup. The UI below shows a close button as the user-gesture
      // path that definitely works.
      console.log('[Callback] Attempting window.close()')
      window.close()

      // Show the "signed in" UI — if window.close() was deferred, the user sees
      // a clean success screen with a button. Clicking the button is a user gesture,
      // which satisfies Chrome's requirement and closes the popup immediately.
      // DO NOT redirect to /app — that would load the full app in the popup.
      setDone(true)
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
          You're all set. Click below to close this window.
        </div>
        {/* onClick is a user gesture — Chrome will execute the pending window.close() */}
        <button
          onClick={() => window.close()}
          style={{
            marginTop: 8, cursor: 'pointer',
            background: '#F4845F', border: 'none', borderRadius: 10,
            padding: '11px 28px', color: '#100A0D',
            fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif",
          }}
        >
          Close this tab
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
