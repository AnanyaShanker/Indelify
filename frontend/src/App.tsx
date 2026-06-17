import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MoodSearch from './components/MoodSearch'
import EnvironmentTab from './components/EnvironmentTab'
import DreamMode from './components/DreamMode'
import LyricsSearch from './components/LyricsSearch'
import LanguageToggle from './components/LanguageToggle'
import type { HistoryEntry, LangPref } from './types'

const TABS = [
  { id: 'mood',        label: 'Mood Search',   icon: '✦', desc: 'Describe how you feel' },
  { id: 'environment', label: 'My Environment', icon: '◎', desc: 'Upload a photo of your space' },
  { id: 'dream',       label: 'Dream Mode',     icon: '◐', desc: 'Describe your last dream' },
  { id: 'lyrics',      label: 'Lyrical Theme',  icon: '♩', desc: 'Find songs by word or theme' },
] as const

type TabId = typeof TABS[number]['id']

const TAB_META: Record<TabId, { color: string; glow: string; ambient: string }> = {
  mood:        { color: '#D4888A', glow: 'rgba(212,136,138,0.16)', ambient: 'radial-gradient(ellipse at 16% 18%, rgba(212,136,138,0.13) 0%, transparent 54%), radial-gradient(ellipse at 84% 84%, rgba(180,100,108,0.08) 0%, transparent 50%)' },
  environment: { color: '#6EC5B8', glow: 'rgba(110,197,184,0.14)', ambient: 'radial-gradient(ellipse at 20% 16%, rgba(90,185,172,0.11) 0%, transparent 54%), radial-gradient(ellipse at 80% 84%, rgba(60,158,148,0.07) 0%, transparent 50%)' },
  dream:       { color: '#A78BFA', glow: 'rgba(167,139,250,0.14)', ambient: 'radial-gradient(ellipse at 18% 22%, rgba(138,100,218,0.11) 0%, transparent 54%), radial-gradient(ellipse at 82% 74%, rgba(88,48,178,0.07) 0%, transparent 50%)' },
  lyrics:      { color: '#E8C06A', glow: 'rgba(232,192,106,0.14)', ambient: 'radial-gradient(ellipse at 18% 18%, rgba(220,185,90,0.10) 0%, transparent 54%), radial-gradient(ellipse at 82% 82%, rgba(185,155,60,0.07) 0%, transparent 50%)' },
}

const HISTORY_KEY  = 'indelify_history'
const THEME_KEY    = 'indelify_theme'
const LANG_PREF_KEY = 'indelify_lang_pref'
const MAX_HISTORY  = 10

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }
  catch { return [] }
}

export default function App() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab]         = useState<TabId>('mood')
  const [langPref, setLangPref]           = useState<LangPref>(() => (localStorage.getItem(LANG_PREF_KEY) as LangPref) || 'all')
  const [history, setHistory]             = useState<HistoryEntry[]>(loadHistory)
  const [theme, setTheme]                 = useState<string>(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [dreamFullscreen, setDreamFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen]     = useState(false)

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) }, [history])
  useEffect(() => { localStorage.setItem(LANG_PREF_KEY, langPref) }, [langPref])
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'ts'>) => {
    setHistory(prev => {
      const item: HistoryEntry = { ...entry, id: Date.now(), ts: Date.now() }
      return [item, ...prev].slice(0, MAX_HISTORY)
    })
  }, [])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const meta    = TAB_META[activeTab]
  const current = TABS.find(t => t.id === activeTab)!

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* Mobile sidebar overlay */}
      <div
        className="sidebar-overlay"
        data-open={String(sidebarOpen)}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="app-sidebar"
        data-open={String(sidebarOpen)}
        style={{
          width: 252, flexShrink: 0,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          display: dreamFullscreen ? 'none' : 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh',
          overflow: 'hidden',
        }}
      >

        {/* Ambient glow — shifts per tab */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 160,
          background: `radial-gradient(ellipse at 50% 0%, ${meta.glow} 0%, transparent 75%)`,
          transition: 'background 0.8s ease',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Logo — clicking returns to landing */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'relative', zIndex: 1,
            padding: '26px 20px 18px',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--btn-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
              boxShadow: '0 4px 12px var(--btn-shadow)',
            }}>♪</div>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.5px',
            }}>Indelify</span>
          </div>
          <div style={{
            color: 'var(--text-faint)', letterSpacing: '0.06em', paddingLeft: 42,
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 12.5,
          }}>
            Places feel like songs.
          </div>
        </button>

        <div style={{ height: '1px', background: 'var(--border)', margin: '0 16px', position: 'relative', zIndex: 1 }} />

        {/* Language toggle */}
        <div style={{ padding: '14px 14px 10px', position: 'relative', zIndex: 1 }}>
          <div className="label-micro" style={{ marginBottom: 8 }}>Language</div>
          <LanguageToggle value={langPref} onChange={setLangPref} />
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 16px 10px', position: 'relative', zIndex: 1 }} />

        {/* Nav */}
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 3, position: 'relative', zIndex: 1 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
                style={isActive ? { borderLeft: `2px solid ${TAB_META[tab.id].color}` } : {}}
              >
                <span style={{
                  fontSize: 15, lineHeight: 1, flexShrink: 0,
                  color: isActive ? TAB_META[tab.id].color : 'inherit',
                  transition: 'color 0.3s',
                }}>{tab.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5 }}>{tab.label}</span>
                  <span style={{
                    fontSize: 11,
                    color: isActive ? 'var(--text-secondary)' : 'var(--text-faint)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{tab.desc}</span>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Recent history */}
        {history.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px 0', position: 'relative', zIndex: 1 }}>
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 6px 10px' }} />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingLeft: 6, marginBottom: 8,
            }}>
              <span className="label-micro">Recent</span>
              <button
                onClick={() => setHistory([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 10, cursor: 'pointer', padding: '0 6px' }}
              >clear</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {history.slice(0, 8).map(item => {
                const tab = TABS.find(t => t.id === item.tab)
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.tab as TabId)}
                    className="history-item"
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-faint)', flexShrink: 0, marginTop: 1 }}>{tab?.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{item.label || item.input?.slice(0, 28) || 'Search'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
                        {item.trackCount ?? 0} tracks · {timeAgo(item.ts)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          marginTop: history.length > 0 ? 0 : 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-ultrafaint)', lineHeight: 1.7 }}>
            Groq · Spotify · Genius
            <div style={{ fontSize: 9.5, marginTop: 1, color: 'rgba(212,136,138,0.30)', fontStyle: 'italic' }}>
              made with love by ananya &lt;3
            </div>
          </div>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'var(--tab-hover-bg)', border: '1px solid var(--border)',
              borderRadius: 7, color: 'var(--text-faint)', fontSize: 13,
              cursor: 'pointer', padding: '4px 8px', lineHeight: 1, transition: 'all 0.15s',
            }}
          >{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div
          className="topbar-inner"
          style={{
            position: 'relative',
            height: 68,
            borderBottom: '1px solid var(--border-subtle)',
            display: dreamFullscreen ? 'none' : 'flex', alignItems: 'center', gap: 16,
            background: `linear-gradient(to right, ${meta.glow} 0%, transparent 38%)`,
            transition: 'background 0.7s ease',
          }}
        >
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle navigation"
          >☰</button>
          <span style={{ fontSize: 26, color: meta.color, transition: 'color 0.5s ease', lineHeight: 1 }}>
            {current.icon}
          </span>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 17, fontWeight: 600, color: 'var(--text-primary)',
              letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>{current.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
              {current.desc}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <LangBadge langPref={langPref} />
          </div>
          {/* Colored accent underline */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: '28%', height: 1,
            background: `linear-gradient(to right, ${meta.color}66, transparent)`,
            transition: 'background 0.7s ease',
          }} />
        </div>

        {/* Content — key re-mounts on tab change, triggering tab-enter animation */}
        <div key={activeTab} className="tab-content" style={{ flex: 1, backgroundImage: meta.ambient }}>
          <div className="main-content-area">
            {activeTab === 'mood'        && <MoodSearch     langPref={langPref} onResult={addToHistory} />}
            {activeTab === 'environment' && <EnvironmentTab  langPref={langPref} onResult={addToHistory} />}
            {activeTab === 'dream'       && <DreamMode       langPref={langPref} onResult={addToHistory} onFullscreenChange={setDreamFullscreen} />}
            {activeTab === 'lyrics'      && <LyricsSearch    langPref={langPref} onResult={addToHistory} />}
          </div>
        </div>
      </main>
    </div>
  )
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function LangBadge({ langPref }: { langPref: LangPref }) {
  const map: Record<LangPref, { label: string; color: string }> = {
    'all':             { label: 'All Languages',        color: '#D4888A' },
    'hindi-bollywood': { label: '🎵 Hindi · Bollywood', color: '#F97316' },
    'english':         { label: 'English',              color: '#A0C4D8' },
  }
  const { label, color } = map[langPref]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color, border: `1px solid ${color}44`,
      background: `${color}14`,
      borderRadius: 999, padding: '3px 10px',
      letterSpacing: '0.03em',
    }}>{label}</span>
  )
}
