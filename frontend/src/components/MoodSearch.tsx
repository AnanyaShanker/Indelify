import { useState } from 'react'
import api, { extractError } from '../api'
import TrackCard from './TrackCard'
import TrackCardSkeleton from './TrackCardSkeleton'
import type { LangPref, MoodResult, HistoryEntry } from '../types'

interface Props {
  langPref: LangPref
  onResult: (entry: Omit<HistoryEntry, 'id' | 'ts'>) => void
}

const VALENCE_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  Positive:  { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)',  color: '#4ade80' },
  Negative:  { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: '#f87171' },
  Mixed:     { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  color: '#fb923c' },
  Ambiguous: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', color: '#a78bfa' },
}

const AROUSAL_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  'Very Calm':       { bg: 'rgba(147,197,253,0.1)', border: 'rgba(147,197,253,0.25)', color: '#93c5fd' },
  'Calm':            { bg: 'rgba(103,232,249,0.1)', border: 'rgba(103,232,249,0.25)', color: '#67e8f9' },
  'Medium Energy':   { bg: 'rgba(253,224,71,0.1)',  border: 'rgba(253,224,71,0.25)',  color: '#fde047' },
  'High Energy':     { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  color: '#fb923c' },
  'Very High Energy':{ bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', color: '#f87171' },
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
          const activeColor = intensity > 0.7 ? '#f87171' : intensity > 0.4 ? '#fb923c' : '#D4888A'
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

export default function MoodSearch({ langPref, onResult }: Props) {
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<MoodResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [lastText, setLastText] = useState('')
  const [copied, setCopied]     = useState(false)

  async function doSearch(input: string) {
    setLoading(true); setResult(null); setError(null)
    try {
      const { data } = await api.post<MoodResult>('/analyze/text', { text: input, language_preference: langPref })
      setResult(data)
      onResult({ tab: 'mood', label: data.mood_label, input, trackCount: data.tracks.length })
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div>
      <div className="tab-section-header">
        <h2 className="tab-section-title">Mood Search</h2>
        <p className="tab-section-desc">
          Describe exactly how you feel — in a word, a sentence, or a paragraph.
          {langPref === 'hindi-bollywood' && (
            <span style={{ color: '#FB923C', marginLeft: 6 }}>
              Hindi words like <em>dard, tanhaai, mohabbat</em> work perfectly.
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <label htmlFor="mood-input" className="sr-only">Describe how you feel</label>
        <textarea
          id="mood-input"
          className="input-field"
          rows={4}
          placeholder={langPref === 'hindi-bollywood'
            ? 'Dil mein ek dard hai jo samajh nahi aata...'
            : "I feel like I'm standing at the edge of something new, nervous and excited at the same time..."}
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ marginBottom: 14 }}
        />
        <button className="btn-primary" type="submit" disabled={loading || !text.trim()}>
          {loading ? 'Reading your mood...' : 'Find My Songs'}
        </button>
      </form>

      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '32px 0 16px', animation: 'fadeInUp 0.5s 0.15s ease both' }}>
          <div style={{
            display: 'inline-flex', width: 76, height: 76, borderRadius: '50%',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(212,136,138,0.20) 0%, rgba(184,104,112,0.08) 55%, transparent 100%)',
            fontSize: 30, color: 'rgba(212,136,138,0.60)', marginBottom: 18,
            animation: 'pulseGlow 5s ease-in-out infinite',
          }}>✦</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            fontSize: 16.5, color: 'var(--text-faint)', lineHeight: 1.75,
            maxWidth: 300, margin: '0 auto',
          }}>
            Type anything — a memory, a feeling,<br />a situation. Music will find you.
          </div>
        </div>
      )}

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
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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
            <IntensityBar value={result.emotional_intensity} />
          </div>

          {(result.current_state || result.desired_state) && (
            <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {result.current_state && <div>{result.current_state}</div>}
              {result.desired_state && <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>→ {result.desired_state}</div>}
            </div>
          )}

          {(result.situational_context?.length || result.psychological_intent?.length) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
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

          {result.imagery?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              {result.imagery.map((img, i) => (
                <span key={i} style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>✦ {img}</span>
              ))}
            </div>
          )}

          {(result.attributes?.length || result.situation_tags?.length || result.vibe_tags?.length) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {result.attributes?.map(a => <span key={a} className="pill">{a}</span>)}
              {result.situation_tags?.map(t => <span key={t} className="pill" style={{ opacity: 0.75 }}>{t}</span>)}
              {result.vibe_tags?.map(t => <span key={t} className="pill" style={{ opacity: 0.6 }}>{t}</span>)}
            </div>
          )}

          <MusicDNA mc={result.music_characteristics} />

          {result.tracks?.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                onClick={copyTracks}
                style={{ background: 'none', border: '1px solid var(--border)', color: copied ? 'var(--accent-mid)' : 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", transition: 'color 0.2s' }}
              >{copied ? '✓ copied' : 'copy list'}</button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.tracks?.map((track, i) => <TrackCard key={i} track={track} index={i} />)}
          </div>
        </div>
      )}
    </div>
  )
}
