import { useEffect, useState } from 'react'

export default function SpotifyWriteCallback() {
  const [status, setStatus] = useState('Connecting to Spotify…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setStatus('Spotify auth cancelled.')
      window.opener?.postMessage({ type: 'SPOTIFY_WRITE_ERROR', error }, window.location.origin)
      setTimeout(() => window.close(), 1500)
      return
    }

    if (!code) {
      setStatus('No auth code received.')
      window.opener?.postMessage({ type: 'SPOTIFY_WRITE_ERROR', error: 'No auth code received' }, window.location.origin)
      setTimeout(() => window.close(), 1500)
      return
    }

    const verifier = localStorage.getItem('spotify_pkce_verifier')
    if (!verifier) {
      setStatus('Auth session expired. Please try again.')
      window.opener?.postMessage({ type: 'SPOTIFY_WRITE_ERROR', error: 'PKCE verifier missing' }, window.location.origin)
      setTimeout(() => window.close(), 1500)
      return
    }

    setStatus('Exchanging token…')
    fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${window.location.origin}/spotify-write-callback`,
        client_id: '984e62fe91eb4a10a0bb33ec7296e7c4',
        code_verifier: verifier,
      }).toString(),
    })
      .then(r => r.json())
      .then(data => {
        console.log('[SpotifyCallback] token response:', JSON.stringify({ scope: data.scope, error: data.error, token_len: data.access_token?.length }))
        if (data.access_token) {
          localStorage.removeItem('spotify_pkce_verifier')
          window.opener?.postMessage({ type: 'SPOTIFY_WRITE_TOKEN', token: data.access_token, scope: data.scope }, window.location.origin)
          window.close()
        } else {
          const msg = data.error_description || data.error || 'Token exchange failed'
          setStatus(`Error: ${msg}`)
          window.opener?.postMessage({ type: 'SPOTIFY_WRITE_ERROR', error: msg }, window.location.origin)
          setTimeout(() => window.close(), 2000)
        }
      })
      .catch(err => {
        const msg = err?.message || 'Network error during token exchange'
        setStatus(`Error: ${msg}`)
        window.opener?.postMessage({ type: 'SPOTIFY_WRITE_ERROR', error: msg }, window.location.origin)
        setTimeout(() => window.close(), 2000)
      })
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#111', color: '#fff',
      fontFamily: 'Inter, sans-serif', fontSize: 14, flexDirection: 'column', gap: 12,
    }}>
      <div style={{ width: 32, height: 32, border: '2px solid #1DB954', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span>{status}</span>
    </div>
  )
}
