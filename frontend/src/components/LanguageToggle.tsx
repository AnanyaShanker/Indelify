import type { LangPref } from '../types'

interface Props {
  value: LangPref
  onChange: (v: LangPref) => void
}

const OPTIONS: { value: LangPref; label: string; sublabel: string; icon: string; activeColor: string; activeBg: string; activeBorder: string }[] = [
  { value: 'all',             label: 'All',       sublabel: 'Global mix',   icon: '🌐', activeColor: '#D4888A', activeBg: 'rgba(212,136,138,0.15)', activeBorder: 'rgba(212,136,138,0.35)' },
  { value: 'hindi-bollywood', label: 'Bollywood', sublabel: 'Hindi · Urdu', icon: '🎵', activeColor: '#FB923C', activeBg: 'rgba(249,115,22,0.14)',  activeBorder: 'rgba(249,115,22,0.35)'  },
  { value: 'english',         label: 'English',   sublabel: 'Only',         icon: '🎧', activeColor: '#38BDF8', activeBg: 'rgba(56,189,248,0.13)',  activeBorder: 'rgba(56,189,248,0.3)'   },
]

export default function LanguageToggle({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8,
              border: `1px solid ${active ? opt.activeBorder : 'transparent'}`,
              background: active ? opt.activeBg : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{opt.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? opt.activeColor : 'var(--text-muted)', fontFamily: "'Inter', sans-serif", lineHeight: 1.2 }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 10, color: active ? opt.activeColor + 'AA' : 'var(--text-faint)', fontFamily: "'Inter', sans-serif" }}>
                {opt.sublabel}
              </span>
            </div>
            {active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: opt.activeColor, flexShrink: 0 }} />}
          </button>
        )
      })}
    </div>
  )
}
