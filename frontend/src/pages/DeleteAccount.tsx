import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'
import DeleteAccountModal from '../components/DeleteAccountModal'

// Public account-deletion page, linked from the Google Play data safety form.
// Play requires a web URL where users can delete their account without
// reinstalling the app.
export default function DeleteAccount() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showAuth, setShowAuth]     = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleted, setDeleted]       = useState(false)

  const linkStyle = { color: '#F4845F' }
  const primaryBtn = {
    border: 'none', borderRadius: 10, padding: '11px 20px',
    fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)',
      padding: '60px 24px 100px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-faint)', fontSize: 13, padding: 0,
            marginBottom: 48, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Back
        </button>

        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#F4845F', marginBottom: 14, opacity: 0.8,
          }}>Account</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700,
            margin: 0, letterSpacing: '-0.02em',
          }}>Delete your Indelify account</h1>
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 28 }}>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>What gets deleted</h2>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Your account (name, email, profile picture and account ID)</li>
              <li>All of your saved playlists</li>
              <li>Your saved search history</li>
            </ul>
            <p style={{ margin: '10px 0 0' }}>
              Deletion is immediate and permanent. We don't keep any of this data after your account is deleted.
              Photos you upload are never stored, so there is nothing to delete for them.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>In the app</h2>
            <p style={{ margin: 0 }}>
              Open the menu, tap <strong>delete account</strong> under your name, type DELETE and confirm.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>On this page</h2>
            {deleted ? (
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>Your account and all its data have been deleted.</p>
            ) : user ? (
              <>
                <p style={{ margin: '0 0 14px' }}>
                  Signed in as <strong>{user.email}</strong>.
                </p>
                <button
                  onClick={() => setShowDelete(true)}
                  style={{ ...primaryBtn, background: '#dc2626', color: '#fff' }}
                >Delete my account</button>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 14px' }}>Sign in with the account you want to delete.</p>
                <button
                  onClick={() => setShowAuth(true)}
                  style={{ ...primaryBtn, background: 'rgba(244,132,95,0.12)', color: '#F4845F', border: '1px solid rgba(244,132,95,0.25)' }}
                >Sign in</button>
              </>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>By email</h2>
            <p style={{ margin: 0 }}>
              Can't sign in? Email{' '}
              <a href="mailto:ananyashanker24@gmail.com?subject=Delete%20my%20Indelify%20account" style={linkStyle}>
                ananyashanker24@gmail.com
              </a>{' '}
              from the address linked to your account. We'll delete it within 7 days.
            </p>
          </div>
        </div>
      </div>

      {showAuth && !user && <AuthModal onClose={() => setShowAuth(false)} />}
      {showDelete && user && (
        <DeleteAccountModal
          onClose={() => setShowDelete(false)}
          onDeleted={() => { setShowDelete(false); setDeleted(true) }}
        />
      )}
    </div>
  )
}
