import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        setStatus('Something went wrong. Please try again.')
        setTimeout(() => {
          if (window.opener) window.close()
          else window.location.replace('/app')
        }, 2000)
        return
      }
      if (window.opener) {
        window.close()
      } else {
        window.location.replace('/app')
      }
    })
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#100A0D', color: '#F5EEF0',
      fontFamily: "'Inter', sans-serif", fontSize: 14,
      flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        width: 28, height: 28,
        border: '2px solid #F4845F', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span>{status}</span>
    </div>
  )
}
