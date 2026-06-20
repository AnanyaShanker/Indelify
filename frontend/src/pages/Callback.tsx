import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CHANNEL = 'indelify-oauth'

function sendToOpener(payload: Record<string, unknown>) {
  const origin = window.location.origin
  if (window.opener && typeof window.opener.postMessage === 'function') {
    try { window.opener.postMessage(payload, origin); return } catch (_) {}
  }
  // BroadcastChannel fallback (when opener is null after cross-origin nav)
  try { const ch = new BroadcastChannel(CHANNEL); ch.postMessage(payload); ch.close() } catch (_) {}
}

export default function Callback() {
  const handled = useRef(false)

  useEffect(() => {
    function finish(session: unknown, error?: string) {
      if (handled.current) return
      handled.current = true

      // Step 1 — send result to main window
      console.log('[Callback] Auth complete. Sending message to opener, session:', !!session)
      if (session) {
        sendToOpener({ type: 'OAUTH_SUCCESS', session })
      } else {
        sendToOpener({ type: 'OAUTH_ERROR', error: error ?? 'Authentication failed' })
      }

      // Step 2 — give the main window 100ms to receive the message and call
      // popupRef.current.close() from the opener side (more reliable than the
      // popup closing itself after cross-origin navigation).
      // window.close() here is a secondary fallback in case the opener path fails.
      setTimeout(() => {
        console.log('[Callback] window.close() firing')
        window.close()
        // Last-resort: if this IS the main window (popup was blocked and the user
        // went through OAuth on the current tab), redirect to the app.
        setTimeout(() => { if (!window.closed) window.location.replace('/app') }, 300)
      }, 100)
    }

    // onAuthStateChange fires after Supabase finishes the PKCE code exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) finish(session)
    })

    // getSession() covers the case where the exchange completed before the
    // listener was registered (e.g. implicit flow tokens already in the hash)
    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) finish(data.session)
      else if (error)   finish(null, error.message)
      // else: PKCE exchange in progress — onAuthStateChange will fire
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
