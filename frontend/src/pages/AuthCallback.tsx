import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Status = 'loading' | 'success' | 'error'

export default function AuthCallback() {
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setStatus('error')
        setErrorMsg(error?.message || 'Authentication failed. Please try again.')
        return
      }
      setStatus('success')
      // Works if this is a real popup opened by window.open()
      // Silently fails if the browser opened it as a tab instead
      window.close()
      // Main window's onAuthStateChange fires automatically via BroadcastChannel —
      // nothing else needed here even if close() doesn't work
    })
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#100A0D', color: '#F5EEF0',
      fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: 16,
      padding: 24, textAlign: 'center',
    }}>
      {status === 'loading' && (
        <>
          <div style={{ width: 28, height: 28, border: '2px solid #F4845F', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <span style={{ fontSize: 14, color: 'rgba(245,238,240,0.55)' }}>Signing you in…</span>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{ fontSize: 28, color: '#F4845F' }}>✦</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Signed in!</div>
          <div style={{ fontSize: 13, color: 'rgba(245,238,240,0.45)', lineHeight: 1.6 }}>
            You can close this tab and return to Indelify.
          </div>
          <button
            onClick={() => window.close()}
            style={{
              marginTop: 8,
              background: 'rgba(244,132,95,0.12)', border: '1px solid rgba(244,132,95,0.3)',
              borderRadius: 10, padding: '10px 24px',
              color: '#F4845F', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >Close this tab</button>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ fontSize: 14, color: 'rgba(248,113,113,0.85)', lineHeight: 1.6, maxWidth: 320 }}>
            {errorMsg}
          </div>
          <button
            onClick={() => window.location.replace('/app')}
            style={{
              background: 'none', border: '1px solid rgba(245,238,240,0.15)',
              borderRadius: 10, padding: '10px 24px',
              color: 'rgba(245,238,240,0.5)', fontSize: 13,
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >Go back to app</button>
        </>
      )}
    </div>
  )
}
