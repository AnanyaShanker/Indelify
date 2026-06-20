import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onClose: () => void
}

export default function AuthModal({ onClose }: Props) {
  const { signInWithSpotify, signInWithGoogle } = useAuth()
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSpotify() {
    setError(null); setLoading(true)
    try { await signInWithSpotify() }
    catch { setError('Could not connect to Spotify. Try again.') }
    finally { setLoading(false) }
  }

  async function handleGoogle() {
    setError(null); setLoading(true)
    try { await signInWithGoogle() }
    catch { setError('Could not connect to Google. Try again.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(5px)' }}
      />
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 22, padding: '40px 32px',
        width: '100%', maxWidth: 380, textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="16" height="26" viewBox="0 0 16 26" fill="none">
            <rect x="0"    y="12" width="3" height="14" rx="1.5" fill="rgba(244,132,95,0.70)"/>
            <rect x="4.3"  y="5"  width="3" height="21" rx="1.5" fill="rgba(244,132,95,0.92)"/>
            <rect x="8.6"  y="0"  width="3" height="26" rx="1.5" fill="rgba(255,185,150,0.88)"/>
            <rect x="12.9" y="7"  width="3" height="19" rx="1.5" fill="rgba(244,132,95,0.78)"/>
          </svg>
        </div>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22, fontWeight: 600, color: 'var(--text-primary)',
          marginBottom: 10, letterSpacing: '-0.01em',
        }}>Sign in to Indelify</h2>
        <p style={{
          fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.65,
        }}>
          Save your searches, build playlists,<br />and keep your history forever.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleSpotify}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '13px 20px', borderRadius: 12,
              background: '#1DB954', border: 'none', color: '#000',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
            onMouseOut={e => { e.currentTarget.style.opacity = loading ? '0.7' : '1' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Continue with Spotify
          </button>

          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '13px 20px', borderRadius: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border-input)',
              color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              opacity: loading ? 0.7 : 1,
              transition: 'border-color 0.15s, opacity 0.15s',
            }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--border-input)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {error && (
          <div className="error-banner" style={{ marginTop: 16, fontSize: 13 }}>{error}</div>
        )}

        <p style={{ marginTop: 24, fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.6 }}>
          Your searches are saved privately to your account only.
        </p>
      </div>
    </div>
  )
}
