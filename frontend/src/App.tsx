import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MoodSearch from './components/MoodSearch'
import EnvironmentTab from './components/EnvironmentTab'
import DreamMode from './components/DreamMode'
import LyricsSearch from './components/LyricsSearch'
import LanguageToggle from './components/LanguageToggle'
import AuthModal from './components/AuthModal'
import SavePlaylistModal from './components/SavePlaylistModal'
import SavedPlaylists from './components/SavedPlaylists'
import { useAuth } from './contexts/AuthContext'
import api, { authHeaders } from './api'
import { stopAll } from './lib/audioPlayer'
import type { HistoryEntry, LangPref, MoodResult, DreamResult, LyricsResult, EnvironmentResult, SearchResult, SavedPlaylist } from './types'


const TABS = [
  { id: 'mood',        label: 'Mood Search',   icon: '✦', desc: 'words, feelings, a memory' },
  { id: 'environment', label: 'My Environment', icon: '◎', desc: 'a photo of your space' },
  { id: 'dream',       label: 'Dream Mode',     icon: '◐', desc: 'last night\'s dream' },
  { id: 'lyrics',      label: 'Lyrical Theme',  icon: '♩', desc: 'a word or theme' },
] as const

type TabId = typeof TABS[number]['id']

const TAB_META: Record<TabId, { color: string; glow: string; ambient: string }> = {
  mood:        { color: '#F4845F', glow: 'rgba(244,132,95,0.16)', ambient: 'radial-gradient(ellipse at 16% 18%, rgba(244,132,95,0.11) 0%, transparent 54%), radial-gradient(ellipse at 84% 84%, rgba(200,80,40,0.07) 0%, transparent 50%)' },
  environment: { color: '#6EC5B8', glow: 'rgba(110,197,184,0.14)', ambient: 'radial-gradient(ellipse at 20% 16%, rgba(90,185,172,0.11) 0%, transparent 54%), radial-gradient(ellipse at 80% 84%, rgba(60,158,148,0.07) 0%, transparent 50%)' },
  dream:       { color: '#A78BFA', glow: 'rgba(167,139,250,0.14)', ambient: 'radial-gradient(ellipse at 18% 22%, rgba(138,100,218,0.11) 0%, transparent 54%), radial-gradient(ellipse at 82% 74%, rgba(88,48,178,0.07) 0%, transparent 50%)' },
  lyrics:      { color: '#E8C06A', glow: 'rgba(232,192,106,0.14)', ambient: 'radial-gradient(ellipse at 18% 18%, rgba(220,185,90,0.10) 0%, transparent 54%), radial-gradient(ellipse at 82% 82%, rgba(185,155,60,0.07) 0%, transparent 50%)' },
}

const HISTORY_KEY  = 'indelify_history'
const THEME_KEY    = 'indelify_theme'
const LANG_PREF_KEY = 'indelify_lang_pref'
const MAX_HISTORY  = 20

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }
  catch { return [] }
}

function getUrlParams(): { tab: TabId | null; q: string | null } {
  const p = new URLSearchParams(window.location.search)
  const tab = p.get('tab') as TabId | null
  const q = p.get('q')
  return { tab: TABS.find(t => t.id === tab) ? tab : null, q }
}

export default function App() {
  const navigate = useNavigate()
  const { user, session, signOut } = useAuth()
  const [activeTab, setActiveTab]         = useState<TabId>(() => getUrlParams().tab ?? 'mood')
  const [langPref, setLangPref]           = useState<LangPref>(() => (localStorage.getItem(LANG_PREF_KEY) as LangPref) || 'all')
  const [history, setHistory]             = useState<HistoryEntry[]>(loadHistory)
  const [theme, setTheme]                 = useState<string>(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [dreamFullscreen, setDreamFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [showAuthModal, setShowAuthModal]   = useState(false)
  const [pendingSave, setPendingSave]       = useState<SearchResult | null>(null)
  const [clearConfirm, setClearConfirm]     = useState(false)
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([])
  const [replayEntry, setReplayEntry]       = useState<HistoryEntry | null>(null)
  const [replayKey, setReplayKey]           = useState(0)
  const [toast, setToast]                   = useState<{ msg: string; leaving: boolean } | null>(null)
  const toastTimerRef                       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [urlAutoSearch]                     = useState<string | null>(() => getUrlParams().q)

  const prevTabRef = useRef(activeTab)
  useEffect(() => {
    if (prevTabRef.current !== activeTab) { stopAll(); prevTabRef.current = activeTab }
  }, [activeTab])

  // Close the sign-in modal as soon as the user becomes authenticated
  useEffect(() => { if (user) setShowAuthModal(false) }, [user])

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) }, [history])
  useEffect(() => { localStorage.setItem(LANG_PREF_KEY, langPref) }, [langPref])
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const fetchSavedPlaylists = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const res = await api.get('/user/playlists', { headers: authHeaders(session.access_token) })
      setSavedPlaylists(res.data)
    } catch {}
  }, [session])

  useEffect(() => {
    if (session) fetchSavedPlaylists()
    else setSavedPlaylists([])
  }, [session, fetchSavedPlaylists])

  const addToHistory = useCallback((entry: SearchResult) => {
    const item: HistoryEntry = {
      id: Date.now(), ts: Date.now(),
      tab: entry.tab, label: entry.label, input: entry.input, trackCount: entry.tracks.length,
      meta: entry.meta,
    }
    setHistory(prev => [item, ...prev].slice(0, MAX_HISTORY))
    if (session?.access_token) {
      api.post('/user/searches', entry, { headers: authHeaders(session.access_token) }).catch(() => {})
    }
  }, [session])

  const handleSavePlaylist = useCallback((entry: SearchResult) => {
    if (!user) { setShowAuthModal(true); return }
    setPendingSave(entry)
  }, [user])

  const deletePlaylist = useCallback(async (id: string) => {
    if (!session) return
    setSavedPlaylists(prev => prev.filter(p => p.id !== id))
    try {
      await api.delete(`/user/playlists/${id}`, { headers: authHeaders(session.access_token) })
    } catch {
      fetchSavedPlaylists()
    }
  }, [session, fetchSavedPlaylists])

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg, leaving: false })
    toastTimerRef.current = setTimeout(() => {
      setToast(t => t ? { ...t, leaving: true } : null)
      toastTimerRef.current = setTimeout(() => setToast(null), 230)
    }, 2800)
  }, [])

  const renamePlaylist = useCallback(async (id: string, name: string) => {
    if (!session) return
    setSavedPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p))
    try {
      await api.patch(`/user/playlists/${id}`, { name }, { headers: authHeaders(session.access_token) })
      showToast(`Renamed to "${name}"`)
    } catch {
      fetchSavedPlaylists()
    }
  }, [session, fetchSavedPlaylists, showToast])

  const executeSave = useCallback(async (name: string, note: string) => {
    if (!session || !pendingSave) return
    await api.post('/user/playlists', {
      name,
      tab: pendingSave.tab,
      tracks: pendingSave.tracks,
      note: note || undefined,
    }, { headers: authHeaders(session.access_token) })
    setPendingSave(null)
    fetchSavedPlaylists()
    showToast(`"${name}" saved`)
  }, [session, pendingSave, fetchSavedPlaylists, showToast])

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
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 160,
          background: `radial-gradient(ellipse at 50% 0%, ${meta.glow} 0%, transparent 75%)`,
          transition: 'background 0.8s ease',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'relative', zIndex: 1,
            padding: '20px 20px 16px',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <svg width="13" height="22" viewBox="0 0 13 22" fill="none" style={{ flexShrink: 0 }}>
              <rect x="0"    y="10" width="2.4" height="12" rx="1.2" fill="rgba(244,132,95,0.70)"/>
              <rect x="3.5"  y="4"  width="2.4" height="18" rx="1.2" fill="rgba(244,132,95,0.92)"/>
              <rect x="7"    y="0"  width="2.4" height="22" rx="1.2" fill="rgba(255,185,150,0.88)"/>
              <rect x="10.5" y="6"  width="2.4" height="16" rx="1.2" fill="rgba(244,132,95,0.78)"/>
            </svg>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1,
                background: 'linear-gradient(135deg, #F4845F 0%, #E8B898 55%, var(--text-primary) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>Indelify</div>
              <div style={{ height: 1, width: '75%', marginTop: 4, background: 'linear-gradient(to right, rgba(244,132,95,0.5), transparent)' }} />
            </div>
          </div>
        </button>

        <div style={{ height: '1px', background: 'var(--border)', margin: '0 16px 10px', position: 'relative', zIndex: 1 }} />

        {/* Nav — icon + label only */}
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
                  fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 2,
                  color: isActive ? TAB_META[tab.id].color : 'inherit',
                  transition: 'color 0.3s',
                }}>{tab.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, lineHeight: 1 }}>{tab.label}</span>
                  <span style={{
                    fontSize: 10.5, lineHeight: 1,
                    color: isActive ? TAB_META[tab.id].color : 'var(--text-faint)',
                    opacity: isActive ? 0.7 : 0.55,
                    fontStyle: 'italic',
                    fontFamily: "'Cormorant Garamond', serif",
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color 0.3s, opacity 0.3s',
                  }}>{tab.desc}</span>
                </div>
              </button>
            )
          })}
        </nav>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '10px 16px 0', position: 'relative', zIndex: 1 }} />

        {/* Language toggle */}
        <div style={{ padding: '12px 14px 10px', position: 'relative', zIndex: 1 }}>
          <div className="label-micro" style={{ marginBottom: 8 }}>Music Language</div>
          <LanguageToggle value={langPref} onChange={setLangPref} />
        </div>

        {/* Scrollable middle: saved playlists + recent history */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
          {savedPlaylists.length > 0 && (
            <SavedPlaylists
              playlists={savedPlaylists}
              onDelete={deletePlaylist}
              onRename={renamePlaylist}
            />
          )}
          {history.length > 0 && (
            <div style={{ padding: '0 10px 0' }}>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 6px 10px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 6, marginBottom: 8 }}>
                <span className="label-micro">Recent</span>
                <button
                  onClick={() => {
                    if (clearConfirm) { setHistory([]); setClearConfirm(false) }
                    else { setClearConfirm(true); setTimeout(() => setClearConfirm(false), 2000) }
                  }}
                  style={{
                    background: 'none', border: 'none',
                    color: clearConfirm ? '#f87171' : 'var(--text-faint)',
                    fontSize: 10, cursor: 'pointer', padding: '0 6px',
                    transition: 'color 0.15s',
                  }}
                >{clearConfirm ? 'sure?' : 'clear'}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {history.slice(0, 12).map(item => {
                  const tab = TABS.find(t => t.id === item.tab)
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.tab as TabId)
                        setReplayEntry(item)
                        setReplayKey(k => k + 1)
                        setSidebarOpen(false)
                      }}
                      className="history-item"
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-faint)', flexShrink: 0, marginTop: 1 }}>{tab?.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.label || item.input?.slice(0, 28) || 'Search'}
                        </div>
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
        </div>

        {/* Bottom: auth + theme toggle — one unified row */}
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '11px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, border: '1px solid var(--border)' }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}
                  </div>
                  <button
                    onClick={signOut}
                    style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 10, cursor: 'pointer', padding: 0, letterSpacing: '0.03em' }}
                  >sign out</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  background: 'rgba(244,132,95,0.10)', border: '1px solid rgba(244,132,95,0.22)',
                  borderRadius: 8, padding: '7px 12px',
                  color: '#F4845F', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', letterSpacing: '0.01em',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(244,132,95,0.17)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(244,132,95,0.10)' }}
              >
                <span style={{ fontSize: 13 }}>✦</span>
                Sign in to save
              </button>
            )}
          </div>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'var(--tab-hover-bg)', border: '1px solid var(--border)',
              borderRadius: 7, color: 'var(--text-faint)', fontSize: 13,
              cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
              transition: 'all 0.15s', flexShrink: 0,
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="topbar-lang">
              <LangBadge langPref={langPref} />
            </div>
            {user ? (
              <button
                className="mobile-avatar-btn"
                onClick={() => setSidebarOpen(o => !o)}
                aria-label="Open menu"
                title={user.user_metadata?.full_name || user.email || 'Account'}
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', display: 'block' }}
                  />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                  </span>
                )}
              </button>
            ) : (
              <button
                className="mobile-signin-btn"
                onClick={() => setShowAuthModal(true)}
              >
                Sign in
              </button>
            )}
          </div>
          {/* Colored accent underline */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            width: '28%', height: 1,
            background: `linear-gradient(to right, ${meta.color}66, transparent)`,
            transition: 'background 0.7s ease',
          }} />
        </div>

        {/* Content — key re-mounts on tab change OR replay, triggering fresh state */}
        <div key={`${activeTab}-${replayKey}`} className="tab-content" style={{ flex: 1, backgroundImage: meta.ambient, display: 'flex', flexDirection: 'column' }}>
          <div className="main-content-area">
            {activeTab === 'mood' && (
              <MoodSearch
                langPref={langPref}
                onResult={addToHistory}
                onSavePlaylist={handleSavePlaylist}
                initialResult={replayEntry?.tab === 'mood' ? replayEntry.meta as unknown as MoodResult : undefined}
                initialInput={replayEntry?.tab === 'mood' ? replayEntry.input : undefined}
                autoSearch={!replayEntry && activeTab === 'mood' ? (urlAutoSearch ?? undefined) : undefined}
              />
            )}
            {activeTab === 'environment' && (
              <EnvironmentTab
                langPref={langPref}
                onResult={addToHistory}
                onSavePlaylist={handleSavePlaylist}
                initialResult={replayEntry?.tab === 'environment' ? replayEntry.meta as unknown as EnvironmentResult : undefined}
                initialInput={replayEntry?.tab === 'environment' ? replayEntry.input : undefined}
              />
            )}
            {activeTab === 'dream' && (
              <DreamMode
                langPref={langPref}
                onResult={addToHistory}
                onSavePlaylist={handleSavePlaylist}
                onFullscreenChange={setDreamFullscreen}
                initialResult={replayEntry?.tab === 'dream' ? replayEntry.meta as unknown as DreamResult : undefined}
                initialInput={replayEntry?.tab === 'dream' ? replayEntry.input : undefined}
                autoSearch={!replayEntry && activeTab === 'dream' ? (urlAutoSearch ?? undefined) : undefined}
              />
            )}
            {activeTab === 'lyrics' && (
              <LyricsSearch
                langPref={langPref}
                onResult={addToHistory}
                onSavePlaylist={handleSavePlaylist}
                initialResult={replayEntry?.tab === 'lyrics' ? replayEntry.meta as unknown as LyricsResult : undefined}
                initialInput={replayEntry?.tab === 'lyrics' ? replayEntry.input : undefined}
                autoSearch={!replayEntry && activeTab === 'lyrics' ? (urlAutoSearch ?? undefined) : undefined}
              />
            )}
          </div>
          <AppFooter />
        </div>
      </main>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {pendingSave && user && (
        <SavePlaylistModal
          defaultName={pendingSave.label}
          onSave={executeSave}
          onClose={() => setPendingSave(null)}
        />
      )}
      {toast && (
        <div className={`toast${toast.leaving ? ' leaving' : ''}`}>
          <div className="toast-dot" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function AppFooter() {
  return (
    <footer className="app-footer" style={{
      borderTop: '1px solid var(--border-subtle)',
      padding: '18px 44px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--bg-sidebar)',
      marginTop: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 600,
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
    </footer>
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
    'all':             { label: 'All Languages', color: '#D4888A' },
    'hindi-bollywood': { label: 'Hindi · Urdu',  color: '#F97316' },
    'english':         { label: 'English',        color: '#A0C4D8' },
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
