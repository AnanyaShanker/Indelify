import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import App from './App'
import NotFound from './pages/NotFound'
import SpotifyWriteCallback from './pages/SpotifyWriteCallback'
import Callback from './pages/Callback'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'

// Short-circuit: if this window is an OAuth callback popup, render ONLY the
// minimal Callback handler — never AuthProvider, Router, or any app UI.
// This prevents the full app from loading inside the popup after sign-in.
const CALLBACK_PATHS = ['/callback', '/spotify-write-callback']

if (CALLBACK_PATHS.includes(window.location.pathname)) {
  // For /spotify-write-callback we still need its own component
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
