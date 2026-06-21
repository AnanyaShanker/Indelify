import { useNavigate, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const EXAMPLES = [
  'A rainy balcony.',
  'A dream you can\'t shake.',
  'A photo from Paris.',
  'A feeling you don\'t have words for.',
]

const SCENES = [
  {
    id: 'mood',
    icon: '✦',
    color: '#D4888A',
    glow: 'rgba(212,136,138,0.18)',
    label: 'Mood Search',
    moment: "A feeling you don't have words for.",
  },
  {
    id: 'environment',
    icon: '◎',
    color: '#6EC5B8',
    glow: 'rgba(110,197,184,0.16)',
    label: 'My Environment',
    moment: 'A rainy balcony. A photo from Paris.',
  },
  {
    id: 'dream',
    icon: '◐',
    color: '#A78BFA',
    glow: 'rgba(167,139,250,0.16)',
    label: 'Dream Mode',
    moment: "A dream you can't shake.",
  },
  {
    id: 'lyrics',
    icon: '♩',
    color: '#E8C06A',
    glow: 'rgba(232,192,106,0.16)',
    label: 'Lyrical Theme',
    moment: '"Clouds." "Distance." "Fire."',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const blobRef1 = useRef<HTMLDivElement>(null)
  const blobRef2 = useRef<HTMLDivElement>(null)
  const blobRef3 = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('indelify_theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 620),
      setTimeout(() => setPhase(3), 980),
      setTimeout(() => setPhase(4), 1340),
      setTimeout(() => setPhase(5), 1700),
      setTimeout(() => setPhase(6), 2260),
      setTimeout(() => setPhase(7), 2860),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      if (blobRef1.current) blobRef1.current.style.transform = `translate(${(x - 0.5) * 28}px, ${(y - 0.5) * 18}px)`
      if (blobRef2.current) blobRef2.current.style.transform = `translate(${(x - 0.5) * -16}px, ${(y - 0.5) * -12}px)`
      if (blobRef3.current) blobRef3.current.style.transform = `translate(${(x - 0.5) * 10}px, ${(y - 0.5) * 8}px)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="landing-root">

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div ref={blobRef1} style={{
          position: 'absolute', top: '-12%', right: '-10%',
          width: 720, height: 720, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,136,138,0.09) 0%, transparent 68%)',
          transition: 'transform 1.0s cubic-bezier(0.25,0.46,0.45,0.94)',
        }} />
        <div ref={blobRef2} style={{
          position: 'absolute', bottom: '0%', left: '-8%',
          width: 580, height: 580, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 68%)',
          transition: 'transform 1.0s cubic-bezier(0.25,0.46,0.45,0.94)',
        }} />
        <div ref={blobRef3} style={{
          position: 'absolute', top: '38%', right: '18%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(110,197,184,0.05) 0%, transparent 68%)',
          transition: 'transform 1.0s cubic-bezier(0.25,0.46,0.45,0.94)',
        }} />
        {/* Noise texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.4,
        }} />
      </div>

      {/* Nav */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <svg width="11" height="19" viewBox="0 0 11 19" fill="none" style={{ flexShrink: 0 }}>
            <rect x="0"   y="9"  width="2.2" height="10" rx="1.1" fill="rgba(244,132,95,0.70)"/>
            <rect x="3"   y="3"  width="2.2" height="16" rx="1.1" fill="rgba(244,132,95,0.92)"/>
            <rect x="6"   y="0"  width="2.2" height="19" rx="1.1" fill="rgba(255,185,150,0.88)"/>
            <rect x="8.8" y="5"  width="2.2" height="14" rx="1.1" fill="rgba(244,132,95,0.78)"/>
          </svg>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 19, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1,
              background: 'linear-gradient(135deg, #F4845F 0%, #E8B898 55%, var(--text-primary) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Indelify</div>
            <div style={{ height: 1, width: '75%', marginTop: 3, background: 'linear-gradient(to right, rgba(244,132,95,0.5), transparent)' }} />
          </div>
        </div>
        <button onClick={() => navigate('/app')} className="landing-nav-btn">Open App →</button>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: 'calc(100vh - 70px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 32px 100px',
      }}>

        {/* Decorative line above headline */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 44,
          opacity: phase >= 1 ? 1 : 0,
          transition: 'opacity 1.0s ease',
        }}>
          <div style={{ width: 48, height: 1, background: 'linear-gradient(to right, transparent, rgba(212,136,138,0.30))' }} />
          <span style={{ fontSize: 11, color: 'rgba(212,136,138,0.45)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Indelify</span>
          <div style={{ width: 48, height: 1, background: 'linear-gradient(to left, transparent, rgba(212,136,138,0.30))' }} />
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(46px, 7.2vw, 90px)',
          fontWeight: 700, fontStyle: 'italic',
          lineHeight: 1.06, letterSpacing: '-0.025em',
          marginBottom: 52,
          background: 'var(--landing-headline)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'none' : 'translateY(28px)',
          transition: 'opacity 1.1s ease, transform 1.1s ease',
        }}>
          What does this<br />moment sound like?
        </h1>

        {/* Examples */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          marginBottom: 48,
        }}>
          {EXAMPLES.map((ex, i) => (
            <p key={i} style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(19px, 2.5vw, 27px)',
              fontStyle: 'italic', lineHeight: 1.35, margin: 0,
              color: i === EXAMPLES.length - 1 ? 'var(--landing-examples-last)' : 'var(--landing-examples-1)',
              opacity: phase >= i + 2 ? 1 : 0,
              transform: phase >= i + 2 ? 'translateY(0)' : 'translateY(18px)',
              transition: 'opacity 0.95s ease, transform 0.95s ease',
            }}>{ex}</p>
          ))}
        </div>

        {/* Tagline */}
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(15px, 1.6vw, 19px)',
          fontWeight: 600, letterSpacing: '-0.01em',
          color: 'var(--landing-tagline)',
          marginBottom: 48, margin: '0 0 48px',
          opacity: phase >= 6 ? 1 : 0,
          transform: phase >= 6 ? 'none' : 'translateY(12px)',
          transition: 'opacity 1.0s ease, transform 1.0s ease',
        }}>
          Indelify finds the soundtrack.
        </p>

        {/* CTA */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          opacity: phase >= 7 ? 1 : 0,
          transform: phase >= 7 ? 'none' : 'translateY(12px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease',
        }}>
          <button onClick={() => navigate('/app')} className="landing-hero-btn">
            Find My Soundtrack
          </button>
          <span style={{ fontSize: 10.5, color: 'rgba(200,160,175,0.55)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            no account needed
          </span>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: 32,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
          opacity: phase >= 7 ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}>
          <span style={{ fontSize: 9.5, color: 'rgba(90,48,64,0.45)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            four ways in
          </span>
          <div className="scroll-hint-line" />
        </div>
      </section>

      {/* ── Scene section header ─────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center', padding: '0 40px 52px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, maxWidth: 900, margin: '0 auto' }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(50,18,32,0.55))' }} />
          <span style={{ fontSize: 9.5, color: 'rgba(90,48,64,0.55)', letterSpacing: '0.20em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            how you discover
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(50,18,32,0.55))' }} />
        </div>
      </div>

      {/* ── Scene cards ──────────────────────────────────────────────────── */}
      <section
        className="scene-cards-grid"
        style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1120, margin: '0 auto',
          padding: '0 40px 120px',
          display: 'grid',
          gap: 14,
        }}
      >
        {SCENES.map((s, i) => (
          <SceneCard key={s.id} scene={s} index={i} onClick={() => navigate(`/app?tab=${s.id}`)} />
        ))}
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center', padding: '0 40px 108px',
      }}>
        <div style={{ width: 1, height: 64, background: 'linear-gradient(to bottom, transparent, rgba(212,136,138,0.22))', margin: '0 auto 48px' }} />
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 'clamp(18px, 2.2vw, 24px)',
          fontStyle: 'italic', lineHeight: 1.85,
          color: 'var(--landing-closing-text)',
          maxWidth: 400, margin: '0 auto 38px',
        }}>
          Some moments can't be described.<br />Only heard.
        </p>
        <button onClick={() => navigate('/app')} className="landing-secondary-btn">
          Start Listening Differently
        </button>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, #F4845F 0%, #E8B898 55%, var(--text-primary) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Indelify</span>
          <span style={{ color: 'var(--text-faint)', fontSize: 12, opacity: 0.4 }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-ultrafaint)' }}>© 2026 Ananya Shanker</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(212,136,138,0.58)', fontStyle: 'italic', letterSpacing: '0.04em' }}>
          made with ♡ by ananya
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', letterSpacing: '0.03em' }}>
          Places feel like songs.
        </div>
        <Link to="/privacy" style={{ fontSize: 11, color: 'var(--text-ultrafaint)', textDecoration: 'none', letterSpacing: '0.04em' }}>
          Privacy Policy
        </Link>
      </footer>
    </div>
  )
}

interface Scene {
  id: string; icon: string; color: string; glow: string
  label: string; moment: string
}

function SceneCard({ scene: s, index, onClick }: { scene: Scene; index: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="scene-card"
      style={{
        '--scene-color': `${s.color}38`,
        '--scene-glow': s.glow,
        animation: `fadeInUp 0.55s ${0.09 * index}s ease both`,
      } as React.CSSProperties}
    >
      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: -70, right: -70,
        width: 220, height: 220, borderRadius: '50%',
        background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Bottom left faint glow */}
      <div style={{
        position: 'absolute', bottom: -40, left: -40,
        width: 160, height: 160, borderRadius: '50%',
        background: `radial-gradient(circle, ${s.glow.replace('0.1', '0.05').replace('0.16', '0.06').replace('0.18', '0.06')} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28,
        position: 'relative',
      }}>
        <span style={{ fontSize: 17, color: s.color, lineHeight: 1 }}>{s.icon}</span>
        <span style={{
          fontSize: 9.5, letterSpacing: '0.20em', textTransform: 'uppercase',
          color: s.color, fontWeight: 600, opacity: 0.70,
          fontFamily: "'Inter', sans-serif",
        }}>{s.label}</span>
      </div>

      {/* Moment — the only line that matters */}
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 'clamp(21px, 2.6vw, 29px)',
        fontStyle: 'italic', fontWeight: 400, lineHeight: 1.28,
        color: 'rgba(245,238,240,0.90)',
        margin: '0 0 32px',
        position: 'relative',
      }}>{s.moment}</p>

      {/* CTA */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: s.color, fontFamily: "'Inter', sans-serif",
        fontWeight: 600, opacity: 0.58,
        position: 'relative',
      }}>
        <span>Try this</span>
        <span style={{ fontSize: 14, fontWeight: 300 }}>→</span>
      </div>
    </div>
  )
}
