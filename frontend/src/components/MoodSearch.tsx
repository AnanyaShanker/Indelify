import { useState, useRef, useEffect, useCallback } from 'react'
import api, { extractError } from '../api'
import TrackCard from './TrackCard'
import TrackCardSkeleton from './TrackCardSkeleton'
import type { LangPref, MoodResult, SearchResult } from '../types'
import { useTheme } from '../hooks/useTheme'

interface Props {
  langPref: LangPref
  onResult: (entry: SearchResult) => void
  onSavePlaylist?: (entry: SearchResult) => void
  initialResult?: MoodResult
  initialInput?: string
  autoSearch?: string
}

const MOOD_PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id:     i,
  left:   `${4 + (i * 3.82) % 90}%`,
  bottom: `${1 + (i * 5.41) % 38}%`,
  size:   1 + (i % 3),
  dur:    9 + (i % 6) * 1.4,
  delay:  (i * 0.62) % 11,
  dx:     `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 7) * 9)}px`,
}))

const VALENCE_DARK: Record<string, { bg: string; border: string; color: string }> = {
  Positive:  { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)',  color: '#4ade80' },
  Negative:  { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: '#f87171' },
  Mixed:     { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  color: '#fb923c' },
  Ambiguous: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', color: '#a78bfa' },
}
const VALENCE_LIGHT: Record<string, { bg: string; border: string; color: string }> = {
  Positive:  { bg: 'rgba(22,101,52,0.10)',  border: 'rgba(22,101,52,0.28)',  color: '#166534' },
  Negative:  { bg: 'rgba(159,18,57,0.10)',  border: 'rgba(159,18,57,0.28)',  color: '#9f1239' },
  Mixed:     { bg: 'rgba(154,52,18,0.10)',  border: 'rgba(154,52,18,0.28)',  color: '#9a3412' },
  Ambiguous: { bg: 'rgba(91,33,182,0.10)',  border: 'rgba(91,33,182,0.28)',  color: '#5b21b6' },
}

const AROUSAL_DARK: Record<string, { bg: string; border: string; color: string }> = {
  'Very Calm':       { bg: 'rgba(147,197,253,0.1)', border: 'rgba(147,197,253,0.25)', color: '#93c5fd' },
  'Calm':            { bg: 'rgba(103,232,249,0.1)', border: 'rgba(103,232,249,0.25)', color: '#67e8f9' },
  'Medium Energy':   { bg: 'rgba(253,224,71,0.1)',  border: 'rgba(253,224,71,0.25)',  color: '#fde047' },
  'High Energy':     { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  color: '#fb923c' },
  'Very High Energy':{ bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: '#f87171' },
}
const AROUSAL_LIGHT: Record<string, { bg: string; border: string; color: string }> = {
  'Very Calm':       { bg: 'rgba(29,78,216,0.10)',  border: 'rgba(29,78,216,0.28)',  color: '#1d4ed8' },
  'Calm':            { bg: 'rgba(8,145,178,0.10)',  border: 'rgba(8,145,178,0.28)',  color: '#0891b2' },
  'Medium Energy':   { bg: 'rgba(161,98,7,0.10)',   border: 'rgba(161,98,7,0.28)',   color: '#a16207' },
  'High Energy':     { bg: 'rgba(154,52,18,0.10)',  border: 'rgba(154,52,18,0.28)',  color: '#9a3412' },
  'Very High Energy':{ bg: 'rgba(159,18,57,0.10)',  border: 'rgba(159,18,57,0.28)',  color: '#9f1239' },
}

function Badge({ label, style }: { label: string; style: { bg: string; border: string; color: string } }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
      background: style.bg, border: `1px solid ${style.border}`, color: style.color,
    }}>{label}</span>
  )
}

function IntensityBar({ value }: { value?: number }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="label-micro">Intensity</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const filled = i < value
          const intensity = value / 10
          const activeColor = intensity > 0.7 ? '#f87171' : intensity > 0.4 ? '#fb923c' : 'rgba(244,132,95,0.75)'
          return (
            <div key={i} style={{
              width: 14, height: 5, borderRadius: 3,
              background: filled ? activeColor : 'var(--border)',
              opacity: filled ? (0.5 + (i / value) * 0.5) : 0.4,
            }} />
          )
        })}
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{value}/10</span>
    </div>
  )
}

function MusicDNA({ mc }: { mc?: MoodResult['music_characteristics'] }) {
  if (!mc || !Object.keys(mc).length) return null
  const levelMap: Record<string, number> = { slow: 1, low: 1, sparse: 1, medium: 2, fast: 3, high: 3, dense: 3 }
  const bars = [
    { label: 'Tempo',       value: mc.tempo },
    { label: 'Energy',      value: mc.energy },
    { label: 'Vocals',      value: mc.vocal_prominence },
    { label: 'Lyrics',      value: mc.lyrical_density },
    { label: 'Danceability',value: mc.danceability },
  ]
  const text = [
    mc.instrumentation       && { label: 'Instrumentation', value: mc.instrumentation },
    mc.emotional_complexity  && { label: 'Complexity',      value: mc.emotional_complexity },
    mc.acoustic_vs_electronic && { label: 'Texture',        value: mc.acoustic_vs_electronic },
    mc.familiarity_preference && { label: 'Familiarity',    value: mc.familiarity_preference },
    mc.popularity_preference  && { label: 'Popularity',     value: mc.popularity_preference },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="result-info-block" style={{ marginBottom: 20 }}>
      <div className="label-micro" style={{ marginBottom: 14 }}>Music DNA</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {bars.map(({ label, value }) => {
          if (!value) return null
          const level = levelMap[value.toLowerCase()] ?? 2
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 76, flexShrink: 0 }}>{label}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{
                    width: 28, height: 4, borderRadius: 2,
                    background: n <= level ? 'var(--accent-mid)' : 'var(--border)',
                    opacity: n <= level ? 1 : 0.4,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>{value}</span>
            </div>
          )
        })}
      </div>
      {text.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          {text.map(({ label, value }) => (
            <div key={label} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-faint)' }}>{label}: </span>{value}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TagRow({ items, color = 'var(--text-muted)', borderColor = 'var(--border)' }: { items?: string[]; color?: string; borderColor?: string }) {
  if (!items?.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item, i) => (
        <span key={i} style={{
          fontSize: 11, color, padding: '3px 9px', borderRadius: 999,
          border: `1px solid ${borderColor}`,
          background: 'rgba(212,136,138,0.05)',
        }}>{item}</span>
      ))}
    </div>
  )
}

export default function MoodSearch({ langPref, onResult, onSavePlaylist, initialResult, initialInput, autoSearch }: Props) {
  const [text, setText]               = useState(initialInput ?? autoSearch ?? '')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<MoodResult | null>(initialResult ?? null)
  const [error, setError]             = useState<string | null>(null)
  const [lastText, setLastText]       = useState(initialInput ?? autoSearch ?? '')
  const [copied, setCopied]           = useState(false)
  const [linkCopied, setLinkCopied]   = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const textareaRef                   = useRef<HTMLTextAreaElement>(null)
  const pendingRef                    = useRef(false)
  const isLight                       = useTheme()
  const VALENCE_STYLES = isLight ? VALENCE_LIGHT : VALENCE_DARK
  const AROUSAL_STYLES = isLight ? AROUSAL_LIGHT : AROUSAL_DARK

  useEffect(() => {
    if (autoSearch && !initialResult) {
      doSearch(autoSearch)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = useCallback(async (input: string, refresh = false, excludeTracks: Array<{ title: string; artist: string }> = []) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setLoading(true); setResult(null); setError(null); setShowDetails(false)
    try {
      const { data } = await api.post<MoodResult>('/analyze/text', {
        text: input,
        language_preference: langPref,
        refresh,
        exclude: excludeTracks,
      })
      setResult(data)
      onResult({ tab: 'mood', label: data.mood_label, input, tracks: data.tracks, meta: data as unknown })
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setLoading(false)
      pendingRef.current = false
    }
  }, [langPref, onResult])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLastText(text)
    doSearch(text)
  }

  function copyTracks() {
    if (!result?.tracks.length) return
    const lines = result.tracks.map((t, i) => `${i + 1}. ${t.title} — ${t.artist}`).join('\n')
    navigator.clipboard.writeText(`${result.mood_label}\n\n${lines}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    const url = `${window.location.origin}/app?tab=mood&q=${encodeURIComponent(lastText)}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function searchAgain() {
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    textareaRef.current?.focus()
  }

  return (
    <div>
      {/* Ambient coral particles */}
      <div className="ambient-particle-layer" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {MOOD_PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute', left: p.left, bottom: p.bottom,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'rgba(244,132,95,0.48)',
            ['--dx' as string]: p.dx,
            animation: `particleDrift ${p.dur}s ${p.delay}s ease-in-out infinite`,
          } as React.CSSProperties} />
        ))}
      </div>

      {/* Mood Search identity header */}
      <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 62, height: 62, borderRadius: '50%', margin: '0 auto 14px',
          background: 'radial-gradient(circle, rgba(244,132,95,0.55) 0%, rgba(200,80,40,0.18) 100%)',
          border: '1px solid rgba(244,132,95,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, color: 'rgba(255,195,160,0.92)',
          animation: 'pulseGlow 5.5s ease-in-out infinite',
        }}>✦</div>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 36, fontWeight: 600, margin: 0,
          background: 'linear-gradient(135deg, #F4845F 0%, #FFB899 48%, #FFCBA4 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Mood Search</h2>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
          fontSize: 15.5, color: isLight ? 'rgba(140,70,35,0.78)' : 'rgba(180,120,90,0.58)', lineHeight: 1.75,
          maxWidth: 320, margin: '10px auto 0',
        }}>
          Describe exactly how you feel —<br />a word, a memory, a moment.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20, position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto 20px' }}>
        <label htmlFor="mood-input" className="sr-only">Describe how you feel</label>
        <div style={{ position: 'relative', marginBottom: langPref === 'hindi-bollywood' ? 8 : 14 }}>
          <textarea
            ref={textareaRef}
            id="mood-input"
            className="mood-textarea"
            rows={4}
            maxLength={2000}
            placeholder={langPref === 'hindi-bollywood'
              ? 'Dil mein ek dard hai jo samajh nahi aata...'
              : "I was standing at the edge of something — the feeling had no name, only weight…"}
            value={text}
            onChange={e => setText(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-input)',
              backdropFilter: 'blur(22px)',
              border: 'none', outline: 'none',
              borderRadius: 20,
              padding: '22px 26px',
              color: 'var(--text-primary)',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 17, lineHeight: 1.85, resize: 'none',
              fontStyle: text ? 'normal' : 'italic',
              transition: 'box-shadow 0.3s',
            }}
            onFocus={e => { e.target.style.boxShadow = '0 0 0 1.5px rgba(244,132,95,0.65), 0 0 50px rgba(200,90,50,0.18), inset 0 0 60px rgba(160,70,30,0.10)' }}
            onBlur={e => { e.target.style.boxShadow = '' }}
          />
          <span style={{
            position: 'absolute', bottom: 16, right: 20,
            fontSize: 16, color: 'rgba(244,132,95,0.22)',
            animation: 'pulseGlow 4s ease-in-out infinite',
            pointerEvents: 'none',
          }}>✦</span>
          {text.length > 1800 && (
            <span style={{ position: 'absolute', bottom: 14, left: 18, fontSize: 10, color: text.length >= 2000 ? '#f87171' : 'var(--text-faint)', fontFamily: "'Inter', sans-serif" }}>
              {text.length}/2000
            </span>
          )}
        </div>
        {langPref === 'hindi-bollywood' && (
          <p style={{ fontSize: 11, color: '#FB923C', margin: '0 0 14px', letterSpacing: '0.01em' }}>
            Hindi words like <em>dard, tanhaai, mohabbat</em> work perfectly.
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            display: 'block', width: '100%',
            background: (!loading && text.trim())
              ? 'linear-gradient(135deg, rgba(210,90,55,0.92) 0%, rgba(165,50,25,0.96) 100%)'
              : 'rgba(110,45,20,0.28)',
            color: 'rgba(255,220,200,0.95)',
            border: '1px solid rgba(244,132,95,0.28)',
            borderRadius: 14, padding: '15px 0',
            fontSize: 13, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
            cursor: (!loading && text.trim()) ? 'pointer' : 'not-allowed',
            opacity: (!loading && text.trim()) ? 1 : 0.35,
            transition: 'all 0.3s',
          }}
          onMouseEnter={e => { if (!loading && text.trim()) { e.currentTarget.style.boxShadow = '0 10px 40px rgba(210,90,55,0.55)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
        >
          {loading ? 'Reading your mood...' : 'Find My Songs'}
        </button>
      </form>


      {loading && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16, letterSpacing: '0.03em' }}>
            Interpreting your emotional landscape...
          </div>
          <TrackCardSkeleton count={5} />
        </div>
      )}

      {error && (
        <div>
          <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>
          <button
            onClick={() => doSearch(lastText)}
            style={{ background: 'none', border: '1px solid var(--border-input)', color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
          >Try again</button>
        </div>
      )}

      {result && (
        <div className="fade-in">

          {/* Mood label row + toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: 'var(--accent-mid)' }}>
                {result.mood_label}
              </span>
              {result.emotional_valence && (
                <Badge label={result.emotional_valence} style={VALENCE_STYLES[result.emotional_valence] ?? VALENCE_STYLES.Ambiguous} />
              )}
              {result.emotional_arousal && (
                <Badge label={result.emotional_arousal} style={AROUSAL_STYLES[result.emotional_arousal] ?? AROUSAL_STYLES['Medium Energy']} />
              )}
            </div>
            <button
              onClick={() => setShowDetails(d => !d)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                color: showDetails ? 'var(--accent-mid)' : 'var(--text-faint)',
                borderRadius: 7, padding: '4px 11px',
                fontSize: 11, cursor: 'pointer',
                letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif",
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'color 0.2s, border-color 0.2s',
                flexShrink: 0,
                borderColor: showDetails ? 'var(--accent-mid)' : undefined,
              }}
            >
              <span style={{ fontSize: 9, transition: 'transform 0.2s', display: 'inline-block', transform: showDetails ? 'rotate(180deg)' : 'none' }}>▲</span>
              {showDetails ? 'hide details' : 'details'}
            </button>
          </div>

          {/* Collapsible details */}
          {showDetails && (
            <div style={{ marginBottom: 20, animation: 'fadeInUp 0.22s ease both' }}>
              <IntensityBar value={result.emotional_intensity} />

              {(result.current_state || result.desired_state) && (
                <div style={{ marginTop: 14, marginBottom: 14, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {result.current_state && <div>{result.current_state}</div>}
                  {result.desired_state && <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>→ {result.desired_state}</div>}
                </div>
              )}

              {(result.situational_context?.length || result.psychological_intent?.length) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {result.situational_context?.length && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="label-micro">Context</span>
                      <TagRow items={result.situational_context} color="var(--text-secondary)" borderColor="rgba(212,136,138,0.25)" />
                    </div>
                  )}
                  {result.psychological_intent?.length && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="label-micro">Intent</span>
                      <TagRow items={result.psychological_intent} color="#a78bfa" borderColor="rgba(167,139,250,0.25)" />
                    </div>
                  )}
                </div>
              )}

              {result.imagery && result.imagery.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  {result.imagery.map((img, i) => (
                    <span key={i} style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>✦ {img}</span>
                  ))}
                </div>
              )}

              {(result.attributes?.length || result.situation_tags?.length || result.vibe_tags?.length) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {result.attributes?.map(a => <span key={a} className="pill">{a}</span>)}
                  {result.situation_tags?.map(t => <span key={t} className="pill" style={{ opacity: 0.75 }}>{t}</span>)}
                  {result.vibe_tags?.map(t => <span key={t} className="pill" style={{ opacity: 0.6 }}>{t}</span>)}
                </div>
              )}

              <MusicDNA mc={result.music_characteristics} />
            </div>
          )}

          {/* Track list header */}
          {result.tracks?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <span className="label-micro">{result.tracks.length} tracks</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => doSearch(lastText, true, result.tracks.map(t => ({ title: t.title, artist: t.artist })))}
                  title="Get different song suggestions for the same mood"
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)', borderRadius: 7, padding: '5px 10px', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}
                >↻</button>
                {onSavePlaylist && (
                  <button
                    onClick={() => onSavePlaylist({ tab: 'mood', label: result.mood_label, input: lastText, tracks: result.tracks, meta: result as unknown })}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}
                  >save playlist</button>
                )}
                <button
                  onClick={copyTracks}
                  style={{ background: 'none', border: '1px solid var(--border)', color: copied ? 'var(--accent-mid)' : 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", transition: 'color 0.2s' }}
                >{copied ? '✓ copied' : 'copy list'}</button>
                <button
                  onClick={copyLink}
                  style={{ background: 'none', border: '1px solid var(--border)', color: linkCopied ? 'var(--accent-mid)' : 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", transition: 'color 0.2s' }}
                >{linkCopied ? '✓ link copied' : 'share'}</button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.tracks?.map((track, i) => <TrackCard key={i} track={track} index={i} />)}
          </div>

          {/* Search again — bottom of results */}
          {result.tracks?.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={searchAgain}
                style={{
                  background: 'none', border: 'none', padding: '4px 0',
                  color: 'var(--text-faint)', fontSize: 12,
                  cursor: 'pointer', letterSpacing: '0.04em',
                  fontFamily: "'Inter', sans-serif",
                  textDecoration: 'underline', textDecorationColor: 'var(--border)',
                  textUnderlineOffset: 4,
                }}
              >search again</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
