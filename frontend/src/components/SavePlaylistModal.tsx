import { useState } from 'react'
import { extractError } from '../api'

interface Props {
  defaultName: string
  onSave: (name: string, note: string) => Promise<void>
  onClose: () => void
}

export default function SavePlaylistModal({ defaultName, onSave, onClose }: Props) {
  const [name, setName]     = useState(defaultName)
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      await onSave(name.trim(), note.trim())
      setSaved(true)
      setTimeout(onClose, 1400)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)' }}
      />
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '32px 28px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 20px 56px rgba(0,0,0,0.35)',
      }}>
        {saved ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 30, marginBottom: 12, color: 'var(--accent)' }}>✓</div>
            <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>Playlist saved</div>
          </div>
        ) : (
          <>
            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4,
            }}>Save playlist</h3>
            <p style={{
              fontSize: 12, color: 'var(--text-faint)', marginBottom: 18,
              fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            }}>a letter to a feeling</p>

            <label htmlFor="playlist-name" className="sr-only">Playlist name</label>
            <input
              id="playlist-name"
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name this playlist"
              onKeyDown={e => e.key === 'Enter' && !note && handleSave()}
              style={{ marginBottom: 12, width: '100%', boxSizing: 'border-box' }}
              autoFocus
            />

            <label htmlFor="playlist-note" className="sr-only">Your note</label>
            <textarea
              id="playlist-note"
              className="input-field"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What were you feeling? What brought you here? (optional)"
              rows={3}
              maxLength={1000}
              style={{
                marginBottom: note.length > 850 ? 4 : 16,
                width: '100%', boxSizing: 'border-box',
                resize: 'none', lineHeight: 1.55, fontSize: 13,
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: note ? 'italic' : 'normal',
              }}
            />
            {note.length > 850 && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12, textAlign: 'right' }}>
                {note.length}/1000
              </div>
            )}

            {error && <div className="error-banner" style={{ marginBottom: 14, fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="btn-primary"
                style={{ flex: 1 }}
              >{saving ? 'Saving…' : 'Save'}</button>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: '1px solid var(--border-input)',
                  color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 18px',
                  cursor: 'pointer', fontSize: 13, fontFamily: "'Inter', sans-serif",
                }}
              >Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
