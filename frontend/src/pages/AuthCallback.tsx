import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Try to close — works if this is a proper popup (opener will also close it).
        // If close() fails (popup blocked fallback → main window), redirect to app.
        window.close()
        setTimeout(() => {
          if (!window.closed) window.location.replace('/app')
        }, 200)
      }
    })

    // Also handle already-exchanged session (page refresh or slow exchange)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.close()
        setTimeout(() => {
          if (!window.closed) window.location.replace('/app')
        }, 200)
      } else {
        // Show fallback close button after 4s if nothing happened
        setTimeout(() => setShowFallback(true), 4000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#100A0D', color: '#F5EEF0',
      fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: 16,
      padding: 24, textAlign: 'center',
    }}>
      <div style={{ width: 28, height: 28, border: '2px solid #F4845F', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: 14, color: 'rgba(245,238,240,0.55)' }}>Signing you in…</span>

      {showFallback && (
        <button
          onClick={() => window.location.replace('/app')}
          style={{
            marginTop: 8,
            background: 'rgba(244,132,95,0.12)', border: '1px solid rgba(244,132,95,0.3)',
            borderRadius: 10, padding: '10px 24px',
            color: '#F4845F', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >Go to Indelify →</button>
      )}
    </div>
  )
}
