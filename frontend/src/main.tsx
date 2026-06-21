import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import App from './App'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'
import SpotifyWriteCallback from './pages/SpotifyWriteCallback'
import Callback from './pages/Callback'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'

// Short-circuit: if this window is an OAuth callback popup, render ONLY the
// minimal Callback handler — never AuthProvider, Router, or any app UI.
// This prevents the full app from loading inside the popup after sign-in.
const CALLBACK_PATHS = ['/callback', '/auth/callback', '/spotify-write-callback']

// Also detect OAuth redirects that landed on the wrong path (e.g. Supabase fell
// back to the site URL instead of our /callback because the local dev URL wasn't
// in the redirect allowlist). Supabase PKCE passes ?code= in query params;
// implicit flow passes #access_token= in the hash.
const searchParams = new URLSearchParams(window.location.search)
const isOAuthLanding =
  searchParams.has('code') ||
  window.location.hash.startsWith('#access_token=') ||
  window.location.hash.includes('&access_token=')

if (CALLBACK_PATHS.includes(window.location.pathname) || isOAuthLanding) {
  const isSpotifyWrite = window.location.pathname === '/spotify-write-callback'
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isSpotifyWrite ? <SpotifyWriteCallback /> : <Callback />}
    </StrictMode>
  )
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<App />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
