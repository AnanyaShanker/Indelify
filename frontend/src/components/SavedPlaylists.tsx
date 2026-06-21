import { useState, useRef } from 'react'
import type { SavedPlaylist } from '../types'

const TAB_META: Record<string, { icon: string; color: string }> = {
  mood:        { icon: '✦', color: '#F4845F' },
  environment: { icon: '◎', color: '#6EC5B8' },
  dream:       { icon: '◐', color: '#A78BFA' },
  lyrics:      { icon: '♩', color: '#E8C06A' },
}

const SpotifyIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
)

interface Props {
  playlists: SavedPlaylist[]
  onDelete: (id: string) => void
  onRename?: (id: string, name: string) => Promise<void>
}

function RenameInput({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    else onCancel()
  }

  return (
    <input
      ref={inputRef}
      autoFocus
      value={draft}
      maxLength={200}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      }}
      style={{
        flex: 1, minWidth: 0,
        background: 'var(--bg-input)',
        border: '1px solid var(--accent)',
        borderRadius: 5, padding: '2px 7px',
        color: 'var(--text-primary)',
        fontSize: 12, fontFamily: "'Inter', sans-serif",
        outline: 'none',
      }}
    />
  )
}

const INITIAL_SHOW = 5

export default function SavedPlaylists({ playlists, onDelete, onRename }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [renaming, setRenaming] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (!playlists.length) return null

  const visible = showAll ? playlists : playlists.slice(0, INITIAL_SHOW)
  const hidden = playlists.length - INITIAL_SHOW

  async function handleRename(id: string, name: string) {
    setRenaming(null)
    await onRename?.(id, name)
  }

  return (
    <div style={{ padding: '0 10px' }}>
      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 6px 10px' }} />
      <div style={{ paddingLeft: 6, marginBottom: 8 }}>
        <span className="label-micro">Saved</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map(p => {
          const meta = TAB_META[p.tab] ?? { icon: '♪', color: '#D4888A' }
          const isExpanded = expanded[p.id]
          const isRenaming = renaming === p.id
          return (
            <div key={p.id}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 6px', borderRadius: 8,
                background: isExpanded ? 'var(--tab-hover-bg)' : 'none',
              }}>
                <span style={{ fontSize: 10, color: meta.color, flexShrink: 0 }}>{meta.icon}</span>

                {isRenaming ? (
                  <RenameInput
                    value={p.name}
                    onSave={name => handleRename(p.id, name)}
                    onCancel={() => setRenaming(null)}
                  />
                ) : (
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
                      {p.tracks.length} tracks · tap to expand
                    </div>
                  </div>
                )}

                {!isRenaming && onRename && (
                  <button
                    onClick={() => setRenaming(p.id)}
                    title="Rename playlist"
                    style={{
                      background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12, lineHeight: 1,
                      color: 'var(--text-faint)', flexShrink: 0, padding: '2px 3px',
                      opacity: 0.6,
                    }}
                  >✎</button>
                )}

                <button
                  onClick={() => onDelete(p.id)}
                  title="Delete playlist"
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 5, padding: '3px 6px',
                    cursor: 'pointer', fontSize: 11, lineHeight: 1,
                    color: 'var(--text-faint)', flexShrink: 0,
                  }}
                >×</button>
              </div>

              {isExpanded && p.note && (
                <div style={{
                  padding: '6px 10px 6px 22px',
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                  fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6,
                  borderLeft: '2px solid var(--quote-border)', marginLeft: 22, marginBottom: 4,
                }}>
                  {p.note}
                </div>
              )}

              {isExpanded && p.tracks.length > 0 && (
                <div style={{ padding: '4px 6px 8px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.tracks.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {(t.image || t.album_art) && (
                        <img
                          src={(t.image || t.album_art) as string}
                          alt=""
                          style={{ width: 24, height: 24, borderRadius: 3, flexShrink: 0, objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.artist}
                        </div>
                      </div>
                      {t.spotify_url ? (
                        <a
                          href={t.spotify_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Open in Spotify"
                          style={{ flexShrink: 0, color: '#1DB954', display: 'flex', alignItems: 'center', opacity: 0.8 }}
                        >
                          <SpotifyIcon />
                        </a>
                      ) : (
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} ${t.artist}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Search on YouTube"
                          style={{ flexShrink: 0, color: '#ff4444', display: 'flex', alignItems: 'center', opacity: 0.7, fontSize: 10 }}
                        >▶</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-faint)', fontSize: 11, padding: '6px 6px 2px',
            width: '100%', textAlign: 'left', letterSpacing: '0.02em',
          }}
        >
          {showAll ? '↑ show less' : `+ ${hidden} more`}
        </button>
      )}
    </div>
  )
}
