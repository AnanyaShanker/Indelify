import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { extractError } from '../api'

interface Props {
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteAccountModal({ onClose, onDeleted }: Props) {
  const { deleteAccount } = useAuth()
  const [confirmText, setConfirmText] = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const canDelete = confirmText.trim().toUpperCase() === 'DELETE' && !loading

  async function handleDelete() {
    setError(null); setLoading(true)
    try {
      await deleteAccount()
      onDeleted()
    } catch (err) {
      setError(extractError(err))
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div
        onClick={loading ? undefined : onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(5px)' }}
      />
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 22, padding: '36px 28px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22, fontWeight: 600, color: 'var(--text-primary)',
          margin: '0 0 12px', letterSpacing: '-0.01em',
        }}>Delete your account?</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 22px' }}>
          This permanently deletes your Indelify account, your saved playlists and your search history.
          This can't be undone.
        </p>

        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Type <strong>DELETE</strong> to confirm
        </label>
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          disabled={loading}
          autoCapitalize="characters"
          autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg-base)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 12px',
            color: 'var(--text-primary)', fontSize: 14, fontFamily: "'Inter', sans-serif",
            marginBottom: 18,
          }}
        />

        {error && (
          <p style={{ fontSize: 12.5, color: '#f87171', margin: '0 0 14px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, background: 'none', border: '1px solid var(--border)',
              borderRadius: 10, padding: '11px 0',
              color: 'var(--text-secondary)', fontSize: 13.5, fontWeight: 500,
              cursor: loading ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >Cancel</button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            style={{
              flex: 1, border: 'none', borderRadius: 10, padding: '11px 0',
              background: canDelete ? '#dc2626' : 'rgba(220,38,38,0.3)',
              color: '#fff', fontSize: 13.5, fontWeight: 600,
              cursor: canDelete ? 'pointer' : 'default', fontFamily: "'Inter', sans-serif",
            }}
          >{loading ? 'Deleting…' : 'Delete account'}</button>
        </div>
      </div>
    </div>
  )
}
