import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, marginBottom: 24, color: 'var(--text-faint)', lineHeight: 1 }}>◎</div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 600, fontStyle: 'italic',
        color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.02em',
      }}>
        Page not found
      </h1>
      <p style={{
        fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
        fontSize: 18, color: 'var(--text-secondary)', marginBottom: 36, lineHeight: 1.75,
      }}>
        This moment doesn't have a soundtrack yet.
      </p>
      <button onClick={() => navigate('/')} className="btn-primary">
        Back to Indelify
      </button>
    </div>
  )
}
