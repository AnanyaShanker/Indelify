import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const POPUP_DONE_KEY = 'indelify-popup-auth-done'

function finish() {
  // Signal the main window (storage event fires in every OTHER open window)
  localStorage.setItem(POPUP_DONE_KEY, Date.now().toString())
  localStorage.removeItem(POPUP_DONE_KEY)
  // Try closing from inside — works if browser still considers this a script-opened window
  window.close()
  // If window.close() was blocked, redirect to app after 200ms
  setTimeout(() => { if (!window.closed) window.location.replace('/app') }, 200)
}

export default function AuthCallback() {
  useEffect(() => {
    // Listen for SIGNED_IN — fires after Supabase completes the PKCE exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) finish()
    })
    // Catch already-exchanged session (e.g. page refresh)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish()
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#100A0D',
      fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: 12,
    }}>
      <div style={{ width: 28, height: 28, border: '2px solid #F4845F', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 14, color: 'rgba(245,238,240,0.55)' }}>Signing you in…</span>
    </div>
  )
}
