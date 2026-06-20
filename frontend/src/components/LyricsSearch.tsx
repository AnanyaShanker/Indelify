import { useState, useEffect, useRef, useCallback } from 'react'
import api, { extractError } from '../api'
import TrackCard from './TrackCard'
import TrackCardSkeleton from './TrackCardSkeleton'
import type { LangPref, LyricsResult, SearchResult } from '../types'
import { useTheme } from '../hooks/useTheme'

interface Props {
  langPref: LangPref
  onResult: (entry: SearchResult) => void
  onSavePlaylist?: (entry: SearchResult) => void
  initialResult?: LyricsResult
  initialInput?: string
  autoSearch?: string
}

const MATCH_BADGE_DARK: Record<string, { label: string; bg: string; border: string; color: string }> = {
  literal:      { label: 'literal',      bg: 'rgba(99,179,237,0.12)',  border: 'rgba(99,179,237,0.28)',  color: '#90CDF4' },
  metaphorical: { label: 'metaphorical', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', color: '#C4B5FD' },
  adjacent:     { label: 'adjacent',     bg: 'rgba(110,231,183,0.10)', border: 'rgba(110,231,183,0.25)', color: '#6EE7B7' },
}
const MATCH_BADGE_LIGHT: Record<string, { label: string; bg: string; border: string; color: string }> = {
  literal:      { label: 'literal',      bg: 'rgba(30,64,175,0.09)',   border: 'rgba(30,64,175,0.28)',   color: '#1e40af' },
  metaphorical: { label: 'metaphorical', bg: 'rgba(91,33,182,0.09)',   border: 'rgba(91,33,182,0.28)',   color: '#5b21b6' },
  adjacent:     { label: 'adjacent',     bg: 'rgba(6,95,70,0.09)',     border: 'rgba(6,95,70,0.25)',     color: '#065f46' },
}

function MatchBadge({ type }: { type?: string }) {
  const isLight = useTheme()
  const MATCH_BADGE = isLight ? MATCH_BADGE_LIGHT : MATCH_BADGE_DARK
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

export default function LyricsSearch({ langPref, onResult, onSavePlaylist, initialResult, initialInput, autoSearch }: Props) {
  const isLight = useTheme()
  const [word, setWord]           = useState(initialInput ?? autoSearch ?? '')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<LyricsResult | null>(initialResult ?? null)
  const [error, setError]         = useState<string | null>(null)
  const [lastWord, setLastWord]   = useState(initialInput ?? autoSearch ?? '')
  const [copied, setCopied]       = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const pendingRef                  = useRef(false)

  useEffect(() => {
    if (autoSearch && !initialResult) {
      doSearch(autoSearch)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = useCallback(async (input: string, refresh = false) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setLoading(true); setResult(null); setError(null)
    try {
      const { data } = await api.post<LyricsResult>('/analyze/lyrics', { word: input, language_preference: langPref, refresh })
      setResult(data)
      onResult({ tab: 'lyrics', label: `"${input}"`, input, tracks: data.tracks, meta: data as unknown })
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setLoading(false)
      pendingRef.current = false
    }
  }, [langPref, onResult])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim()) return
    setLastWord(word.trim())
    doSearch(word.trim())
  }

  function triggerSearch(term: string) {
    setWord(term)
    setLastWord(term)
    doSearch(term)
  }

  function copyTracks() {
    if (!result?.tracks.length) return
    const lines = result.tracks.map((t, i) => `${i + 1}. ${t.title} — ${t.artist}`).join('\n')
    navigator.clipboard.writeText(`"${result.theme || lastWord}"\n\n${lines}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    const url = `${window.location.origin}/app?tab=lyrics&q=${encodeURIComponent(lastWord)}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const suggestions = langPref === 'hindi-bollywood'
    ? ['dard', 'tanhaai', 'mohabbat', 'judaai', 'zindagi', 'intezaar', 'yaad', 'ishq']
    : langPref === 'english'
    ? ['clouds', 'rain', 'empty', 'forever', 'ghost', 'blue', 'window', 'ocean']
    : ['clouds', 'dard', 'rain', 'mohabbat', 'forever', 'tanhaai', 'ghost', 'ishq']

  const canSubmit = !loading && !!word.trim()

  return (
    <div>
      {/* Identity header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 62, height: 62, borderRadius: '50%', margin: '0 auto 20px',
          background: 'radial-gradient(circle, rgba(232,192,106,0.55) 0%, rgba(185,150,55,0.18) 100%)',
          border: '1px solid rgba(232,192,106,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, color: 'rgba(255,235,155,0.92)',
          animation: 'pulseGlow 5.5s ease-in-out infinite',
        }}>♩</div>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 36, fontWeight: 600, margin: 0,
          background: 'linear-gradient(135deg, #E8C06A 0%, #F5D98A 48%, #FFE9A0 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Lyrical Theme</h2>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
          fontSize: 15.5, color: isLight ? 'rgba(140,105,20,0.78)' : 'rgba(232,192,106,0.55)', lineHeight: 1.75,
          maxWidth: 320, margin: '10px auto 0',
        }}>
          Find songs that feel like a word —<br />not just songs that say it.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <label htmlFor="lyrics-input" className="sr-only">Word or theme to search for</label>
          <input
            id="lyrics-input"
            className="lyrics-input"
            type="text"
            maxLength={200}
            placeholder='A word, a feeling, a theme… "clouds"'
            value={word}
            onChange={e => setWord(e.target.value)}
            style={{
              flex: 1, boxSizing: 'border-box',
              background: 'var(--bg-input)',
              backdropFilter: 'blur(22px)',
              border: 'none', outline: 'none',
              borderRadius: 14, padding: '14px 20px',
              color: 'var(--text-primary)',
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 17, lineHeight: 1.5,
              transition: 'box-shadow 0.3s',
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 1.5px rgba(232,192,106,0.7), 0 0 40px rgba(200,160,60,0.12)' }}
            onBlur={e => { e.currentTarget.style.boxShadow = '' }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: canSubmit
                ? 'linear-gradient(135deg, rgba(200,155,45,0.92) 0%, rgba(155,115,20,0.96) 100%)'
                : 'rgba(155,120,30,0.22)',
              color: 'rgba(255,240,190,0.95)',
              border: '1px solid rgba(232,192,106,0.28)',
              borderRadius: 14, padding: '13px 22px',
              fontSize: 13, fontWeight: 600,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif",
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.4,
              transition: 'all 0.3s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.boxShadow = '0 10px 36px rgba(185,145,30,0.40)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
          >
            {loading ? 'Thinking…' : 'Find Songs'}
          </button>
        </div>
      </form>

      {/* Fix #3: clicking a suggestion clears any stale result */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(232,192,106,0.38)', alignSelf: 'center', fontFamily: "'Inter', sans-serif" }}>Try:</span>
        {suggestions.map(s => (
          <button key={s}
            onClick={() => { setResult(null); setError(null); triggerSearch(s) }}
            style={{
              background: 'rgba(232,192,106,0.07)',
              border: '1px solid rgba(232,192,106,0.22)',
              color: 'rgba(232,192,106,0.72)',
              borderRadius: 999, padding: '4px 14px', fontSize: 13,
              cursor: 'pointer', transition: 'all 0.18s',
              fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,192,106,0.14)'; e.currentTarget.style.color = 'rgba(232,192,106,0.95)'; e.currentTarget.style.borderColor = 'rgba(232,192,106,0.42)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,192,106,0.07)'; e.currentTarget.style.color = 'rgba(232,192,106,0.72)'; e.currentTarget.style.borderColor = 'rgba(232,192,106,0.22)' }}
          >{s}</button>
        ))}
      </div>

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
          {/* Semantic analysis block */}
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
                        background: 'rgba(232,192,106,0.10)', border: '1px solid rgba(232,192,106,0.22)',
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
                      <span style={{ fontSize: 13, color: '#E8C06A' }}>{result.emotional_register.primary}</span>
                    )}
                    {result.emotional_register.secondary && (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>· {result.emotional_register.secondary}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Track list header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Songs that carry the theme of{' '}
              <span style={{ color: '#E8C06A', fontStyle: 'italic' }}>"{result.theme || word}"</span>
            </div>
            {result.tracks?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { doSearch(lastWord, true) }}
                  title="Get different song suggestions for the same theme"
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)', borderRadius: 7, padding: '5px 10px', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}
                >↻</button>
                {onSavePlaylist && (
                  <button
                    onClick={() => onSavePlaylist({ tab: 'lyrics', label: `"${result.theme || lastWord}"`, input: lastWord, tracks: result.tracks, meta: result as unknown })}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}
                  >save playlist</button>
                )}
                <button
                  onClick={copyTracks}
                  style={{ background: 'none', border: '1px solid var(--border)', color: copied ? '#E8C06A' : 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", transition: 'color 0.2s' }}
                >{copied ? '✓ copied' : 'copy list'}</button>
                <button
                  onClick={copyLink}
                  style={{ background: 'none', border: '1px solid var(--border)', color: linkCopied ? '#E8C06A' : 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", transition: 'color 0.2s' }}
                >{linkCopied ? '✓ link copied' : 'share'}</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.tracks?.length === 0
              ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No results found.</div>
              : result.tracks?.map((track, i) => (
                <TrackCard
                  key={i}
                  track={track}
                  index={i}
                  rightBadge={track.match_type ? <MatchBadge type={track.match_type} /> : undefined}
                />
              ))
            }
          </div>

          {/* Fix #4: search_expansion_terms as related theme chips */}
          {result.search_expansion_terms?.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(232,192,106,0.10)' }}>
              <div className="label-micro" style={{ marginBottom: 12 }}>explore related themes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.search_expansion_terms.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => triggerSearch(term)}
                    style={{
                      background: 'rgba(232,192,106,0.07)',
                      border: '1px solid rgba(232,192,106,0.22)',
                      color: 'rgba(232,192,106,0.72)',
                      borderRadius: 999, padding: '5px 14px', fontSize: 12.5,
                      cursor: 'pointer', transition: 'all 0.18s',
                      fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,192,106,0.14)'; e.currentTarget.style.color = 'rgba(232,192,106,0.95)'; e.currentTarget.style.borderColor = 'rgba(232,192,106,0.42)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,192,106,0.07)'; e.currentTarget.style.color = 'rgba(232,192,106,0.72)'; e.currentTarget.style.borderColor = 'rgba(232,192,106,0.22)' }}
                  >{term}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
