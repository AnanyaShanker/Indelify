import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import api, { extractError } from '../api'
import type { LangPref, DreamResult, HistoryEntry } from '../types'

// Deterministic particle list — same on every render
const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id:     i,
  left:   `${5  + (i * 3.61) % 88}%`,
  bottom: `${2  + (i * 5.83) % 42}%`,
  size:   1 + (i % 3),
  dur:    8 + (i % 7) * 1.3,
  delay:  (i * 0.58) % 10,
  dx:     `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 7) * 8)}px`,
}))

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    default: h = ((r - g) / d + 4) / 6
  }
  return { h: Math.round(h * 360), s, l }
}

function extractDominantHue(imgEl: HTMLImageElement): number | null {
  try {
    const SIZE = 120
    const canvas = document.createElement('canvas')
    canvas.width = SIZE; canvas.height = SIZE
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imgEl, 0, 0, SIZE, SIZE)
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
    const buckets: Record<number, number> = {}
    for (let i = 0; i < data.length; i += 12) {
      const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2])
      if (s > 0.28 && l > 0.10 && l < 0.90) {
        const b = Math.round(h / 15) * 15
        const luminanceWeight = 1 - Math.abs(l - 0.45) * 1.5
        buckets[b] = (buckets[b] || 0) + s * Math.max(luminanceWeight, 0.1)
      }
    }
    let maxScore = 0, dominantHue: number | null = null
    for (const [hue, score] of Object.entries(buckets)) {
      if (score > maxScore) { maxScore = score; dominantHue = Number(hue) }
    }
    return dominantHue
  } catch {
    return null
  }
}

interface Theme {
  borderFaint: string; borderMid: string; borderStrong: string
  glowFaint: string; glowMid: string
  shadowMid: string; shadowFaint: string
  textFaint: string; textMid: string; textBright: string
  shimmer: string; trackSep: string; trackBorder: string
}

function buildTheme(hue: number | null): Theme {
  const h = hue ?? 265
  return {
    borderFaint:  `hsla(${h}, 45%, 55%, 0.18)`,
    borderMid:    `hsla(${h}, 48%, 58%, 0.30)`,
    borderStrong: `hsla(${h}, 52%, 65%, 0.55)`,
    glowFaint:    `hsla(${h}, 48%, 28%, 0.08)`,
    glowMid:      `hsla(${h}, 52%, 35%, 0.22)`,
    shadowMid:    `hsla(${h}, 55%, 45%, 0.22)`,
    shadowFaint:  `hsla(${h}, 50%, 40%, 0.10)`,
    textFaint:    `hsla(${h}, 42%, 62%, 0.38)`,
    textMid:      `hsla(${h}, 45%, 68%, 0.55)`,
    textBright:   `hsla(${h}, 48%, 74%, 0.65)`,
    shimmer:      `hsla(${h}, 50%, 62%, 0.45)`,
    trackSep:     `hsla(${h}, 45%, 38%, 0.12)`,
    trackBorder:  `hsla(${h}, 45%, 55%, 0.20)`,
  }
}

interface Props {
  langPref: LangPref
  onResult: (entry: Omit<HistoryEntry, 'id' | 'ts'>) => void
  onFullscreenChange?: (fs: boolean) => void
}

export default function DreamMode({ langPref, onResult, onFullscreenChange }: Props) {
  const [dream,       setDream]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<DreamResult | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [dominantHue, setDominantHue] = useState<number | null>(null)
  const [lastDream,   setLastDream]   = useState('')

  const isFullScreen = loading || !!result

  useEffect(() => {
    if (!isFullScreen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isFullScreen])

  useEffect(() => {
    onFullscreenChange?.(isFullScreen)
  }, [isFullScreen, onFullscreenChange])

  const handleReset = useCallback(() => { setResult(null); setDream('') }, [])

  useEffect(() => {
    if (!result) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleReset() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result, handleReset])

  async function doDream(input: string) {
    setLoading(true); setResult(null); setError(null)
    try {
      const { data } = await api.post<DreamResult>('/analyze/dream', { dream: input, language_preference: langPref })
      setResult(data)
      onResult({ tab: 'dream', label: data.mood_label, input, trackCount: data.tracks.length })
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dream.trim()) return
    setLastDream(dream)
    doDream(dream)
  }

  return (
    <>
      <AmbientLayer zIndex={0} hue={null} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {!isFullScreen && (
          <div style={{ animation: 'fadeUpBlur 1s ease forwards' }}>
            <DreamForm dream={dream} setDream={setDream} onSubmit={handleSubmit} />
          </div>
        )}
        {error && !isFullScreen && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              background: 'rgba(100,20,40,0.12)',
              border: '1px solid rgba(175,55,75,0.2)',
              borderRadius: 14, padding: '16px 20px',
              color: 'rgba(240,155,165,0.82)', fontSize: 14,
              marginBottom: 12,
            }}>{error}</div>
            {lastDream && (
              <button
                onClick={() => doDream(lastDream)}
                style={{ background: 'none', border: '1px solid rgba(138,100,210,0.3)', color: 'rgba(200,175,255,0.65)', borderRadius: 10, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              >Try again</button>
            )}
          </div>
        )}
      </div>

      {isFullScreen && createPortal(
        <>
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: dominantHue !== null
              ? `hsla(${dominantHue}, 38%, 4%, 0.98)`
              : 'rgba(4,1,14,0.98)',
            animation: 'dreamEnterBlur 0.7s ease forwards',
            transition: 'background 1.8s ease',
          }} />
          <AmbientLayer zIndex={9999} hue={dominantHue} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, overflowY: 'auto' }}>
            <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 44px' }}>
              {loading && <DreamLoading />}
              {result && !loading && (
                <DreamReveal
                  result={result}
                  onReset={handleReset}
                  onColorExtracted={setDominantHue}
                  hue={dominantHue}
                />
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

function AmbientLayer({ zIndex, hue }: { zIndex: number; hue: number | null }) {
  const h  = hue
  const h2 = hue !== null ? (hue + 35) % 360 : null

  const blob1 = h  !== null ? `radial-gradient(circle, hsla(${h},  72%, 32%, 0.32) 0%, transparent 70%)` : 'radial-gradient(circle, rgba(62,18,148,0.18) 0%, transparent 70%)'
  const blob2 = h  !== null ? `radial-gradient(circle, hsla(${h},  65%, 38%, 0.24) 0%, transparent 70%)` : 'radial-gradient(circle, rgba(88,38,175,0.12) 0%, transparent 70%)'
  const blob3 = h2 !== null ? `radial-gradient(circle, hsla(${h2}, 55%, 30%, 0.16) 0%, transparent 70%)` : 'radial-gradient(circle, rgba(155,80,60,0.06) 0%, transparent 70%)'
  const particleClr = h !== null ? `hsla(${h}, 75%, 82%, 0.60)` : 'rgba(172,142,255,0.35)'

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-22%', right: '-15%', width: 620, height: 620, borderRadius: '50%', background: blob1, animation: 'hazeFloat 28s ease-in-out infinite', transition: 'background 1.8s ease' }} />
      <div style={{ position: 'absolute', top: '32%', left: '-14%', width: 480, height: 480, borderRadius: '50%', background: blob2, animation: 'hazeAlt 34s ease-in-out infinite', transition: 'background 1.8s ease' }} />
      <div style={{ position: 'absolute', bottom: '4%', right: '20%', width: 300, height: 300, borderRadius: '50%', background: blob3, animation: 'hazeFloat 20s ease-in-out infinite reverse', transition: 'background 1.8s ease' }} />
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: p.left, bottom: p.bottom,
          width: p.size, height: p.size, borderRadius: '50%',
          background: particleClr,
          ['--dx' as string]: p.dx,
          animation: `particleDrift ${p.dur}s ${p.delay}s ease-in-out infinite`,
          transition: 'background 1.8s ease',
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

function DreamForm({ dream, setDream, onSubmit }: { dream: string; setDream: (v: string) => void; onSubmit: (e: React.FormEvent) => void }) {
  const canSubmit = dream.trim().length > 0
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', margin: '0 auto 20px',
          background: 'radial-gradient(circle, rgba(115,68,210,0.52) 0%, rgba(55,16,128,0.22) 100%)',
          border: '1px solid rgba(138,100,210,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: 'rgba(200,175,255,0.88)',
          animation: 'orbPulse 5.5s ease-in-out infinite',
        }}>◐</div>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 36, fontWeight: 600, margin: 0,
          background: 'linear-gradient(135deg, #C4A0EC 0%, #9B7FE8 50%, #D8B4F8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          animation: 'textGlow 7s ease-in-out infinite',
        }}>Dream Mode</h2>
        <p style={{
          color: 'rgba(150,128,200,0.52)', fontSize: 15.5, marginTop: 12,
          lineHeight: 1.75, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
        }}>
          Describe your last dream. Even the fragments.<br />
          Even the feelings without images.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <label htmlFor="dream-input" className="sr-only">Describe your dream</label>
          <textarea
            id="dream-input"
            rows={6}
            value={dream}
            onChange={e => setDream(e.target.value)}
            placeholder="I was in a city that kept shifting, and someone I used to know was there but their face kept changing. There was water, always water, rising slowly…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(5,1,17,0.88)',
              backdropFilter: 'blur(22px)',
              border: 'none', outline: 'none', borderRadius: 20,
              padding: '22px 26px',
              color: 'rgba(228,215,255,0.9)',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 17.5, lineHeight: 1.8, resize: 'none',
              fontStyle: dream ? 'normal' : 'italic',
              animation: 'inputGlow 5s ease-in-out infinite',
              transition: 'box-shadow 0.3s',
            }}
            onFocus={e => { e.target.style.boxShadow = '0 0 0 1.5px rgba(138,100,210,0.7), 0 0 50px rgba(80,35,155,0.18), inset 0 0 60px rgba(80,35,155,0.1)' }}
            onBlur={e => { e.target.style.boxShadow = '' }}
          />
          <span style={{
            position: 'absolute', bottom: 16, right: 20,
            fontSize: 18, color: 'rgba(138,100,210,0.28)',
            animation: 'orbPulse 4s ease-in-out infinite',
            pointerEvents: 'none',
          }}>✦</span>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: 'block', width: '100%',
            background: canSubmit
              ? 'linear-gradient(135deg, rgba(95,48,188,0.92) 0%, rgba(60,16,140,0.96) 100%)'
              : 'rgba(50,22,110,0.28)',
            color: 'rgba(220,205,255,0.95)',
            border: '1px solid rgba(138,100,210,0.32)',
            borderRadius: 14, padding: '15px 0',
            fontSize: 13, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.3,
            transition: 'all 0.3s',
          }}
          onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.boxShadow = '0 10px 40px rgba(70,28,155,0.55)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
        >
          Enter the Dream
        </button>
      </form>
    </div>
  )
}

function DreamLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 30, animation: 'dreamEnterBlur 0.7s ease forwards' }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', border: '1.5px solid rgba(70,32,165,0.14)', borderTop: '1.5px solid rgba(168,135,252,0.9)', borderRight: '1.5px solid rgba(200,170,255,0.4)', animation: 'spinOuter 1.7s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '1px solid rgba(120,80,210,0.1)', borderBottom: '1px solid rgba(138,100,210,0.65)', animation: 'spinInner 2.5s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'rgba(175,145,255,0.55)' }}>◐</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontStyle: 'italic', color: 'rgba(148,122,208,0.65)', animation: 'textGlow 3.5s ease-in-out infinite', marginBottom: 8 }}>
          Wandering through your dreamscape…
        </div>
        <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(100,72,175,0.38)', fontFamily: "'Inter', sans-serif" }}>
          recovering what the night left behind
        </div>
      </div>
    </div>
  )
}

function DreamReveal({ result, onReset, onColorExtracted, hue }: { result: DreamResult; onReset: () => void; onColorExtracted: (h: number) => void; hue: number | null }) {
  const [phase, setPhase] = useState(0)
  const t = buildTheme(hue)

  useEffect(() => {
    setPhase(0)
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 4600),
      setTimeout(() => setPhase(5), 6200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [result])

  return (
    <div style={{ animation: 'dreamEnterBlur 1.4s ease forwards' }}>

      {phase >= 1 && (
        <div style={{ textAlign: 'center', padding: '52px 12px 40px', animation: 'residueReveal 1.6s ease forwards' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '0.28em', textTransform: 'uppercase', color: t.textFaint, marginBottom: 22, fontFamily: "'Inter', sans-serif", transition: 'color 1.8s ease' }}>
            what it left behind
          </div>
          <blockquote style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(19px, 3vw, 26px)', lineHeight: 1.72, fontStyle: 'italic', fontWeight: 400, color: 'rgba(218,200,255,0.88)', maxWidth: 660, margin: '0 auto', animation: 'textGlow 9s ease-in-out infinite', padding: 0, border: 'none' }}>
            "{result.emotional_residue}"
          </blockquote>
          <div style={{ width: 60, height: 1, margin: '32px auto 0', background: `linear-gradient(to right, transparent, ${t.shimmer}, transparent)`, transformOrigin: 'left', animation: 'shimmerLine 1.2s 0.4s ease both', transition: 'background 1.8s ease' }} />
        </div>
      )}

      {phase >= 2 && (
        <div style={{ animation: 'fadeUpBlur 1.2s ease forwards' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(26px, 5.5vw, 46px)', fontWeight: 600, fontStyle: 'italic', margin: 0, background: 'linear-gradient(140deg, #EFE3FF 0%, #C9AAEE 35%, #9B7FE8 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {result.mood_label}
            </h1>
          </div>
          {result.dream_image && (
            <DreamImage src={result.dream_image} attributes={result.music_attributes} onColorExtracted={onColorExtracted} hue={hue} />
          )}
        </div>
      )}

      {phase >= 3 && (
        <div style={{ animation: 'fadeUpBlur 1.1s ease forwards' }}>
          {result.symbolic_core && result.symbolic_core.length > 0 && (
            <div style={{ marginBottom: 44 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: t.textFaint, marginBottom: 26, textAlign: 'center', fontFamily: "'Inter', sans-serif", transition: 'color 1.8s ease' }}>
                artifacts recovered
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
                {result.symbolic_core.map((sym, i) => <SymbolArtifact key={i} symbol={sym} index={i} theme={t} />)}
              </div>
            </div>
          )}
          {result.waking_transition_state && (
            <div style={{ marginBottom: 50, padding: '18px 22px 18px 20px', borderLeft: `2px solid ${t.borderMid}`, background: `linear-gradient(to right, ${t.glowFaint}, transparent)`, borderRadius: '0 14px 14px 0', animation: 'fadeUpBlur 0.9s 0.2s ease both', transition: 'border-color 1.8s ease, background 1.8s ease' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.textFaint, marginBottom: 10, fontFamily: "'Inter', sans-serif", transition: 'color 1.8s ease' }}>on waking</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16.5, fontStyle: 'italic', lineHeight: 1.72, color: t.textBright, transition: 'color 1.8s ease' }}>
                {result.waking_transition_state}
              </div>
            </div>
          )}
        </div>
      )}

      {phase >= 4 && result.tracks && result.tracks.length > 0 && (
        <div style={{ animation: 'fadeUpBlur 1.1s ease forwards', marginBottom: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${t.borderMid})`, transition: 'background 1.8s ease' }} />
            <span style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: t.textFaint, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', transition: 'color 1.8s ease' }}>
              frequencies recovered from this dream
            </span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${t.borderMid})`, transition: 'background 1.8s ease' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {result.tracks.map((track, i) => (
              <DreamTrackFragment key={i} track={track} index={i} total={result.tracks.length} theme={t} />
            ))}
          </div>
        </div>
      )}

      {phase >= 5 && (
        <div style={{ textAlign: 'center', paddingBottom: 48, animation: 'fadeUpBlur 1s ease forwards' }}>
          <div style={{ width: 80, height: 1, margin: '0 auto 30px', background: `linear-gradient(to right, transparent, ${t.shimmer}, transparent)`, transition: 'background 1.8s ease' }} />
          <button
            onClick={onReset}
            style={{ background: 'none', border: `1px solid ${t.borderFaint}`, borderRadius: 10, padding: '10px 30px', color: t.textMid, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", cursor: 'pointer', transition: 'all 0.35s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.color = 'rgba(220,205,255,0.85)'; e.currentTarget.style.boxShadow = `0 0 28px ${t.shadowFaint}` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.borderFaint; e.currentTarget.style.color = t.textMid; e.currentTarget.style.boxShadow = '' }}
          >
            Return to waking
          </button>
        </div>
      )}
    </div>
  )
}

function DreamImage({ src, attributes, onColorExtracted, hue }: { src: string; attributes?: string[]; onColorExtracted: (h: number) => void; hue: number | null }) {
  const t = buildTheme(hue)
  return (
    <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', marginBottom: 44, height: 400 }}>
      <img
        src={src}
        alt="Dream"
        onLoad={e => {
          const h = extractDominantHue(e.currentTarget)
          if (h !== null) onColorExtracted(h)
        }}
        style={{ position: 'absolute', width: '108%', height: '115%', top: '-7.5%', left: '-4%', objectFit: 'cover', display: 'block', animation: 'imageBreathe 34s ease-in-out infinite', transformOrigin: 'center center' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 20%, rgba(4,1,14,0.55) 75%, rgba(4,1,14,0.9) 100%)', animation: 'vignettePulse 12s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: 'linear-gradient(to top, rgba(4,1,14,1) 0%, rgba(4,1,14,0.6) 50%, transparent 100%)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to bottom, rgba(4,1,14,0.72) 0%, transparent 100%)' }} />
      {attributes && attributes.length > 0 && (
        <div style={{ position: 'absolute', bottom: 22, left: 24, right: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {attributes.map((a, i) => (
            <span key={i} style={{ padding: '5px 14px', borderRadius: 999, background: 'rgba(4,1,14,0.72)', border: `1px solid ${t.borderFaint}`, color: t.textBright, fontSize: 11, letterSpacing: '0.06em', backdropFilter: 'blur(12px)', fontFamily: "'Inter', sans-serif", transition: 'border-color 1.8s ease, color 1.8s ease' }}>{a}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

function SymbolArtifact({ symbol, index, theme: t }: { symbol: string; index: number; theme: Theme }) {
  const [held, setHeld] = useState(false)
  return (
    <div
      onClick={() => setHeld(h => !h)}
      style={{ position: 'relative', padding: '22px 30px', borderRadius: 18, background: held ? t.glowMid : 'rgba(12,4,32,0.72)', border: `1px solid ${held ? t.borderStrong : t.borderFaint}`, cursor: 'pointer', backdropFilter: 'blur(20px)', textAlign: 'center', minWidth: 148, transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s', boxShadow: held ? `0 0 40px ${t.shadowMid}, 0 0 80px ${t.shadowFaint}` : 'none', animation: `symbolReveal 0.9s ${index * 0.22}s ease both, symbolFloat ${5.5 + index * 1.1}s ${index * 0.9}s ease-in-out infinite` }}
    >
      <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: held ? t.borderStrong : t.textFaint, marginBottom: 10, fontFamily: "'Inter', sans-serif", transition: 'color 0.4s' }}>
        {NUMERALS[index] ?? index + 1}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 21, fontStyle: 'italic', color: held ? 'rgba(230,212,255,0.96)' : 'rgba(185,160,242,0.72)', lineHeight: 1.3, marginBottom: held ? 12 : 6, transition: 'color 0.4s' }}>
        {symbol}
      </div>
      {!held && <div style={{ fontSize: 9.5, letterSpacing: '0.1em', color: t.textFaint, fontFamily: "'Inter', sans-serif" }}>hold to examine</div>}
      {held && <div style={{ fontSize: 13.5, fontStyle: 'italic', lineHeight: 1.6, color: t.textBright, fontFamily: "'Cormorant Garamond', serif", animation: 'fadeUpBlur 0.45s ease forwards' }}>a fragment that returned with you</div>}
      {held && <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${t.glowMid} 0%, transparent 70%)`, pointerEvents: 'none', animation: 'orbPulse 4s ease-in-out infinite' }} />}
    </div>
  )
}

interface TrackEntry { title: string; artist: string; album?: string; album_art?: string | null; spotify_url?: string; reason?: string }

function DreamTrackFragment({ track, index, total, theme: t }: { track: TrackEntry; index: number; total: number; theme: Theme }) {
  const [open, setOpen] = useState(false)
  const isLast = index === total - 1
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ padding: '20px 0', borderBottom: isLast ? 'none' : `1px solid ${t.trackSep}`, cursor: 'pointer', animation: `trackReveal 0.9s ${0.06 + index * 0.11}s ease both`, transition: 'background 0.2s, border-color 1.8s ease' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, fontStyle: 'italic', color: t.textFaint, minWidth: 22, textAlign: 'right', transition: 'color 1.8s ease' }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <div style={{ width: 46, height: 46, borderRadius: 9, overflow: 'hidden', flexShrink: 0, border: `1px solid ${t.borderFaint}`, filter: open ? 'saturate(0.65) brightness(0.82)' : 'saturate(0.22) brightness(0.62)', transition: 'filter 0.5s, border-color 1.8s ease' }}>
          {track.album_art
            ? <img src={track.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'rgba(50,18,115,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: t.textFaint }}>◐</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 600, fontStyle: 'italic', color: open ? 'rgba(230,215,255,0.96)' : 'rgba(192,170,248,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.35s' }}>
            {track.title}
          </div>
          <div style={{ fontSize: 12.5, marginTop: 3, color: t.textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 1.8s ease' }}>
            {track.artist}{track.album && <span style={{ opacity: 0.55 }}> · {track.album}</span>}
          </div>
        </div>
        {isLast && <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.textFaint, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 1.8s ease' }}>↑ surface</div>}
        {track.spotify_url && (
          <a
            href={track.spotify_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ flexShrink: 0, fontSize: 11, letterSpacing: '0.06em', color: 'rgba(30,215,96,0.45)', textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(30,215,96,0.14)', borderRadius: 6, transition: 'all 0.25s', fontFamily: "'Inter', sans-serif" }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(30,215,96,0.88)'; e.currentTarget.style.borderColor = 'rgba(30,215,96,0.42)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(30,215,96,0.45)'; e.currentTarget.style.borderColor = 'rgba(30,215,96,0.14)' }}
          >play</a>
        )}
      </div>
      {open && track.reason && (
        <div style={{ marginTop: 14, marginLeft: 84, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: 'italic', lineHeight: 1.75, color: t.textBright, borderLeft: `1.5px solid ${t.trackBorder}`, paddingLeft: 14, animation: 'fadeUpBlur 0.45s ease forwards', transition: 'color 1.8s ease, border-color 1.8s ease' }}>
          {track.reason}
        </div>
      )}
    </div>
  )
}
