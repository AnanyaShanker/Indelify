import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Shared channel name used by AuthContext listener
const CHANNEL = 'indelify-oauth'

function sendToOpener(payload: Record<string, unknown>) {
  const origin = window.location.origin
  // postMessage works when window.opener is available (script-opened popup)
  if (window.opener && typeof window.opener.postMessage === 'function') {
    try { window.opener.postMessage(payload, origin); return } catch (_) {}
  }
  // BroadcastChannel fallback: fires in all same-origin windows
  try {
    const ch = new BroadcastChannel(CHANNEL)
    ch.postMessage(payload)
    ch.close()
  } catch (_) {}
}

export default function Callback() {
  const handled = useRef(false)

  useEffect(() => {
    function finish(session: unknown, error?: string) {
      if (handled.current) return
      handled.current = true

      if (session) {
        sendToOpener({ type: 'OAUTH_SUCCESS', session })
      } else {
        sendToOpener({ type: 'OAUTH_ERROR', error: error ?? 'Authentication failed' })
      }

      window.close()
      // If window.close() is blocked (popup blocker fallback — we are the main window),
      // redirect to the app so the user isn't stuck on this page.
      setTimeout(() => { if (!window.closed) window.location.replace('/app') }, 300)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) finish(session)
    })

    // Also check for an already-exchanged session (e.g. Supabase finished PKCE
    // exchange before our listener was registered)
    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) finish(data.session)
      else if (error) finish(null, error.message)
      // If neither: PKCE exchange still in progress — onAuthStateChange will fire
    })

    return () => subscription.unsubscribe()
  }, [])

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
