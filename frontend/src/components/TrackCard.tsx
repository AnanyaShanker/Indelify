import { useState, useRef, useEffect } from 'react'
import { playPreview } from '../lib/audioPlayer'
import type { Track } from '../types'

interface Props { track: Track; index: number; rightBadge?: React.ReactNode }

export default function TrackCard({ track, index, rightBadge }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [artHovered, setArtHovered] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => () => { stopRef.current?.() }, [])

  function togglePreview() {
    if (!track.preview_url) return
    if (isPlaying) {
      stopRef.current?.()
      stopRef.current = null
      setIsPlaying(false)
    } else {
      const stop = playPreview(track.preview_url, () => { setIsPlaying(false); stopRef.current = null })
      stopRef.current = stop
      setIsPlaying(true)
    }
  }

  return (
    <div className="track-card fade-in" style={{ animationDelay: `${index * 0.07}s`, opacity: 0 }}>
      <div className="flex gap-3 items-start">

        {/* Album art + optional preview overlay */}
        <div
          style={{ flexShrink: 0, position: 'relative', width: 56, height: 56 }}
          onMouseEnter={() => setArtHovered(true)}
          onMouseLeave={() => setArtHovered(false)}
        >
          {track.album_art ? (
            <img
              src={track.album_art}
              alt={`${track.title} artwork`}
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(212,136,138,0.18) 0%, rgba(184,104,112,0.08) 100%)',
              border: '1px solid rgba(212,136,138,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MusicNoteIcon />
            </div>
          )}
          {track.preview_url && (
            <button
              onClick={togglePreview}
              aria-label={isPlaying ? 'Pause preview' : 'Play 30s preview'}
              style={{
                position: 'absolute', inset: 0, borderRadius: 10,
                background: isPlaying || artHovered ? 'rgba(0,0,0,0.52)' : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 18, lineHeight: 1,
                opacity: isPlaying || artHovered ? 1 : 0,
                pointerEvents: isPlaying || artHovered ? 'auto' : 'none',
                transition: 'background 0.18s, opacity 0.18s',
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 600, fontSize: 15, color: 'var(--text-primary)',
                lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {track.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {track.artist}
                {track.album && <span style={{ color: 'var(--text-faint)' }}> · {track.album}</span>}
              </div>
              {track.preview_url && isPlaying && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#1DB954', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}>
                  ♪ playing preview
                </div>
              )}
            </div>

            <div className="track-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {rightBadge}
              {track.spotify_url ? (
                <a
                  href={track.spotify_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(30,215,96,0.08)',
                    border: '1px solid rgba(30,215,96,0.20)',
                    color: '#1DB954', borderRadius: 8,
                    padding: '5px 10px', fontSize: 12, fontWeight: 600,
                    textDecoration: 'none', transition: 'background 0.2s, border-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,215,96,0.15)'; e.currentTarget.style.borderColor = 'rgba(30,215,96,0.38)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,215,96,0.08)'; e.currentTarget.style.borderColor = 'rgba(30,215,96,0.20)' }}
                >
                  <SpotifyIcon /> Play
                </a>
              ) : (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Search on YouTube"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,0,0,0.07)',
                    border: '1px solid rgba(255,0,0,0.18)',
                    color: '#ff4444', borderRadius: 8,
                    padding: '5px 10px', fontSize: 12, fontWeight: 600,
                    textDecoration: 'none', transition: 'background 0.2s, border-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,0,0.14)'; e.currentTarget.style.borderColor = 'rgba(255,0,0,0.32)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,0,0,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,0,0,0.18)' }}
                >
                  <YouTubeIcon /> Search
                </a>
              )}
              {track.genius_url && (
                <a
                  href={track.genius_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="track-genius-btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,215,0,0.06)',
                    border: '1px solid rgba(255,215,0,0.16)',
                    color: '#D4A852', borderRadius: 8,
                    padding: '5px 10px', fontSize: 12, fontWeight: 600,
                    textDecoration: 'none', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,215,0,0.06)'}
                >
                  Genius
                </a>
              )}
            </div>
          </div>

          {track.reason && (
            <div style={{
              marginTop: 10, fontSize: 13.5, color: 'var(--text-secondary)',
              fontStyle: 'italic', lineHeight: 1.6,
              fontFamily: "'Cormorant Garamond', serif",
              borderLeft: '2px solid var(--quote-border)', paddingLeft: 12,
            }}>
              {track.reason}
            </div>
          )}

          {track.lyric_snippet && (
            <div style={{
              marginTop: 8, fontSize: 12.5, color: 'var(--text-faint)',
              lineHeight: 1.55, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            }}>
              "{track.lyric_snippet}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MusicNoteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(212,136,138,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function SpotifyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}
