import { useState } from 'react'
import api, { extractError } from '../api'
import TrackCard from './TrackCard'
import TrackCardSkeleton from './TrackCardSkeleton'
import type { LangPref, LyricsResult, HistoryEntry } from '../types'

interface Props {
  langPref: LangPref
  onResult: (entry: Omit<HistoryEntry, 'id' | 'ts'>) => void
}

const MATCH_BADGE: Record<string, { label: string; bg: string; border: string; color: string }> = {
  literal:      { label: 'literal',      bg: 'rgba(99,179,237,0.12)',  border: 'rgba(99,179,237,0.28)',  color: '#90CDF4' },
  metaphorical: { label: 'metaphorical', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', color: '#C4B5FD' },
  adjacent:     { label: 'adjacent',     bg: 'rgba(110,231,183,0.10)', border: 'rgba(110,231,183,0.25)', color: '#6EE7B7' },
}

function MatchBadge({ type }: { type?: string }) {
  const s = MATCH_BADGE[type ?? 'adjacent'] ?? MATCH_BADGE.adjacent
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
      fontFamily: "'Inter', sans-serif", flexShrink: 0, alignSelf: 'flex-start', marginTop: 1,
    }}>{s.label}</span>
  )
}

export default function LyricsSearch({ langPref, onResult }: Props) {
  const [word, setWord]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<LyricsResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [lastWord, setLastWord] = useState('')
  const [copied, setCopied]     = useState(false)

  async function doSearch(input: string) {
    setLoading(true); setResult(null); setError(null)
    try {
      const { data } = await api.post<LyricsResult>('/analyze/lyrics', { word: input, language_preference: langPref })
      setResult(data)
      onResult({ tab: 'lyrics', label: `"${input}"`, input, trackCount: data.tracks.length })
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim()) return
    setLastWord(word)
    doSearch(word)
  }

  function copyTracks() {
    if (!result?.tracks.length) return
    const lines = result.tracks.map((t, i) => `${i + 1}. ${t.title} — ${t.artist}`).join('\n')
    navigator.clipboard.writeText(`"${result.theme || lastWord}"\n\n${lines}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const suggestions = langPref === 'hindi-bollywood'
    ? ['dard', 'tanhaai', 'mohabbat', 'judaai', 'zindagi', 'intezaar', 'yaad', 'ishq']
    : langPref === 'english'
    ? ['clouds', 'rain', 'empty', 'forever', 'ghost', 'blue', 'window', 'ocean']
    : ['clouds', 'dard', 'rain', 'mohabbat', 'forever', 'tanhaai', 'ghost', 'ishq']

  return (
    <div>
      <div className="tab-section-header">
        <h2 className="tab-section-title">Lyrical Theme Search</h2>
        <p className="tab-section-desc">Find songs that <em>feel</em> like a word — not just songs that say it.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <label htmlFor="lyrics-input" className="sr-only">Word or theme to search for</label>
          <input
            id="lyrics-input"
            className="input-field"
            type="text"
            placeholder='A word, a feeling, a theme… "clouds"'
            value={word}
            onChange={e => setWord(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" type="submit" disabled={loading || !word.trim()} style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Thinking…' : 'Find Songs'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>Try:</span>
        {suggestions.map(s => (
          <button key={s} onClick={() => setWord(s)} style={{
            background: 'var(--tab-hover-bg)', border: '1px solid var(--tab-active-border)',
            color: 'var(--text-secondary)', borderRadius: 999, padding: '4px 12px', fontSize: 13,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{s}</button>
        ))}
      </div>

      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '28px 0 16px', animation: 'fadeInUp 0.5s 0.15s ease both' }}>
          <div style={{
            display: 'inline-flex', width: 76, height: 76, borderRadius: '50%',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(232,192,106,0.18) 0%, rgba(185,155,70,0.08) 55%, transparent 100%)',
            fontSize: 34, color: 'rgba(232,192,106,0.60)', marginBottom: 18,
            animation: 'pulseGlow 5s ease-in-out infinite',
          }}>♩</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            fontSize: 16.5, color: 'var(--text-faint)', lineHeight: 1.75,
            maxWidth: 300, margin: '0 auto',
          }}>
            A single word holds a whole world of songs.<br />Let's find them.
          </div>
        </div>
      )}

      {loading && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16, letterSpacing: '0.03em' }}>
            Expanding the theme of "{word}"…
          </div>
          <TrackCardSkeleton count={5} />
        </div>
      )}

      {error && (
        <div>
          <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>
          <button
            onClick={() => doSearch(lastWord)}
            style={{ background: 'none', border: '1px solid var(--border-input)', color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
          >Try again</button>
        </div>
      )}

      {result && (
        <div className="fade-in">
          {(result.literal_meaning || result.metaphorical_meanings?.length > 0) && (
            <div className="result-info-block" style={{ marginBottom: 24 }}>
              {result.literal_meaning && (
                <div style={{ marginBottom: result.metaphorical_meanings?.length ? 14 : 0 }}>
                  <div className="label-micro" style={{ marginBottom: 5 }}>literal meaning</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{result.literal_meaning}</div>
                </div>
              )}
              {result.metaphorical_meanings?.length > 0 && (
                <div style={{ marginBottom: result.emotional_register ? 14 : 0 }}>
                  <div className="label-micro" style={{ marginBottom: 8 }}>what it really means</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {result.metaphorical_meanings.map((m, i) => (
                      <span key={i} style={{
                        padding: '4px 12px', borderRadius: 999,
                        background: 'rgba(212,136,138,0.10)', border: '1px solid rgba(212,136,138,0.22)',
                        color: 'var(--text-secondary)', fontSize: 13,
                      }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.emotional_register && (
                <div>
                  <div className="label-micro" style={{ marginBottom: 6 }}>emotional register</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {result.emotional_register.primary && (
                      <span style={{ fontSize: 13, color: 'var(--accent-mid)' }}>{result.emotional_register.primary}</span>
                    )}
                    {result.emotional_register.secondary && (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>· {result.emotional_register.secondary}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Songs that carry the theme of{' '}
              <span style={{ color: 'var(--accent-mid)', fontStyle: 'italic' }}>"{result.theme || word}"</span>
            </div>
            {result.tracks?.length > 0 && (
              <button
                onClick={copyTracks}
                style={{ background: 'none', border: '1px solid var(--border)', color: copied ? 'var(--accent-mid)' : 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", transition: 'color 0.2s', flexShrink: 0 }}
              >{copied ? '✓ copied' : 'copy list'}</button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.tracks?.length === 0
              ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No results found.</div>
              : result.tracks?.map((track, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {track.match_type && (
                    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
                      <MatchBadge type={track.match_type} />
                    </div>
                  )}
                  <TrackCard track={track} index={i} />
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
