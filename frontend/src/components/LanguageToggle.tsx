import type { LangPref } from '../types'

interface Props {
  value: LangPref
  onChange: (v: LangPref) => void
}

const OPTIONS: { value: LangPref; label: string; activeColor: string; activeBg: string }[] = [
  { value: 'all',             label: 'All',          activeColor: '#D4888A', activeBg: 'rgba(212,136,138,0.18)' },
  { value: 'hindi-bollywood', label: 'Hindi · Urdu', activeColor: '#FB923C', activeBg: 'rgba(249,115,22,0.16)'  },
  { value: 'english',         label: 'English',      activeColor: '#38BDF8', activeBg: 'rgba(56,189,248,0.15)'  },
]

export default function LanguageToggle({ value, onChange }: Props) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-input)',
      border: '1px solid var(--border-input)',
      borderRadius: 10,
      padding: 3,
      gap: 2,
    }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '6px 4px',
              borderRadius: 7,
              border: 'none',
              background: active ? opt.activeBg : 'transparent',
              color: active ? opt.activeColor : 'var(--text-faint)',
              fontSize: 11,
              fontWeight: active ? 600 : 400,
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.18s',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
