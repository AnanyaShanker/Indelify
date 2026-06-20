import { useState, useCallback, useRef, useEffect } from 'react'
import api, { extractError } from '../api'
import TrackCard from './TrackCard'
import TrackCardSkeleton from './TrackCardSkeleton'
import type { LangPref, EnvironmentResult, SearchResult } from '../types'
import { useTheme } from '../hooks/useTheme'

interface Props {
  langPref: LangPref
  onResult: (entry: SearchResult) => void
  onSavePlaylist?: (entry: SearchResult) => void
  initialResult?: EnvironmentResult
  initialInput?: string
}

const MAX_IMAGES = 6

export default function EnvironmentTab({ langPref, onResult, onSavePlaylist, initialResult, initialInput }: Props) {
  const [files, setFiles]       = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<EnvironmentResult | null>(initialResult ?? null)
  const [error, setError]       = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [replayLabel]           = useState(initialInput ?? '')
  const inputRef    = useRef<HTMLInputElement>(null)
  const pendingRef  = useRef(false)
  const previewsRef = useRef<string[]>([])
  const isLight     = useTheme()

  const MAX_FILE_SIZE = 50 * 1024 * 1024

  useEffect(() => () => { previewsRef.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const all = Array.from(fileList)
    let incoming = all.filter(f => f.type.startsWith('image/'))
    if (!incoming.length) {
      setError(all.length === 1 ? 'That file isn\'t an image. Please upload a JPG, PNG, or WEBP.' : 'None of those files are images. Please upload JPG, PNG, or WEBP files.')
      return
    }
    const tooLarge = incoming.filter(f => f.size > MAX_FILE_SIZE)
    if (tooLarge.length) {
      setError(`File${tooLarge.length > 1 ? 's' : ''} too large (max 50 MB each): ${tooLarge.map(f => f.name).join(', ')}`)
      incoming = incoming.filter(f => f.size <= MAX_FILE_SIZE)
      if (!incoming.length) return
    }
    setFiles(prev => {
      const canAdd = MAX_IMAGES - prev.length
      if (canAdd <= 0) return prev
      return [...prev, ...incoming.slice(0, canAdd)]
    })
    setPreviews(prev => {
      const canAdd = MAX_IMAGES - prev.length
      if (canAdd <= 0) return prev
      const newUrls = incoming.slice(0, canAdd).map(f => URL.createObjectURL(f))
      previewsRef.current = [...previewsRef.current, ...newUrls]
      return [...prev, ...newUrls]
    })
    setResult(null); setError(null)
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i])
    previewsRef.current = previewsRef.current.filter(u => u !== previews[i])
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function clearAll() {
    previews.forEach(p => URL.revokeObjectURL(p))
    previewsRef.current = []
    setFiles([]); setPreviews([]); setResult(null); setError(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  async function doUpload(currentFiles: File[]) {
    if (!currentFiles.length || pendingRef.current) return
    pendingRef.current = true
    setLoading(true); setResult(null); setError(null)
    try {
      const form = new FormData()
      currentFiles.forEach(f => form.append('files', f))
      form.append('language_preference', langPref)
      const { data } = await api.post<EnvironmentResult>('/analyze/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      const label = currentFiles.length === 1 ? currentFiles[0].name : `${currentFiles.length} photos`
      onResult({ tab: 'environment', label: data.mood_label, input: label, tracks: data.tracks, meta: data as unknown })
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setLoading(false)
      pendingRef.current = false
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    doUpload(files)
  }

  function copyTracks() {
    if (!result?.tracks.length) return
    const lines = result.tracks.map((t, i) => `${i + 1}. ${t.title} — ${t.artist}`).join('\n')
    navigator.clipboard.writeText(`${result.mood_label}\n\n${lines}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canAddMore = files.length < MAX_IMAGES

  return (
    <div>
      {/* Identity header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 62, height: 62, borderRadius: '50%', margin: '0 auto 20px',
          background: 'radial-gradient(circle, rgba(110,197,184,0.55) 0%, rgba(60,155,148,0.18) 100%)',
          border: '1px solid rgba(110,197,184,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, color: 'rgba(160,230,220,0.92)',
          animation: 'pulseGlow 5.5s ease-in-out infinite',
        }}>◎</div>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 36, fontWeight: 600, margin: 0,
          background: 'linear-gradient(135deg, #6EC5B8 0%, #A8E6DF 48%, #D4F0EC 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>My Environment</h2>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
          fontSize: 15.5, color: isLight ? 'rgba(30,100,90,0.72)' : 'rgba(80,150,140,0.62)', lineHeight: 1.75,
          maxWidth: 320, margin: '10px auto 0',
        }}>
          Upload photos of your space or trip.<br />Let the moments speak in music.
        </p>
      </div>

      {files.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            marginBottom: 16, padding: '44px 24px',
            border: `2px dashed ${dragging ? 'rgba(110,197,184,0.72)' : 'rgba(110,197,184,0.28)'}`,
            borderRadius: 14, textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'rgba(110,197,184,0.05)' : 'rgba(110,197,184,0.02)',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <div style={{
            display: 'inline-flex', width: 72, height: 72, borderRadius: '50%',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(110,197,184,0.18) 0%, rgba(60,155,148,0.07) 55%, transparent 100%)',
            marginBottom: 16, animation: 'pulseGlow 5.5s ease-in-out infinite',
            color: 'rgba(110,197,184,0.60)', fontSize: 28,
          }}>◎</div>
          <div style={{ color: 'rgba(110,197,184,0.78)', fontSize: 15, marginBottom: 6 }}>
            Drag & drop photos here, or click to browse
          </div>
          <div style={{ color: 'rgba(110,197,184,0.42)', fontSize: 13 }}>
            JPG, PNG, WEBP · up to {MAX_IMAGES} photos
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(110,197,184,0.28)' }}>
                <img src={src} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                    width: 24, height: 24, color: '#fff', fontSize: 14, lineHeight: 1,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            ))}
            {canAddMore && (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  aspectRatio: '1', borderRadius: 10,
                  border: `2px dashed ${dragging ? 'rgba(110,197,184,0.72)' : 'rgba(110,197,184,0.25)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(110,197,184,0.52)', fontSize: 13, transition: 'border-color 0.2s',
                }}
              >
                <span style={{ fontSize: 26, marginBottom: 4, lineHeight: 1 }}>+</span>
                <span>Add more</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            {files.length} photo{files.length !== 1 ? 's' : ''} selected
            {canAddMore ? ` · ${MAX_IMAGES - files.length} more allowed` : ' · maximum reached'}
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { addFiles(e.target.files); e.target.value = '' }} />

      {files.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: !loading
                ? 'linear-gradient(135deg, rgba(70,175,162,0.92) 0%, rgba(35,130,118,0.96) 100%)'
                : 'rgba(40,120,110,0.28)',
              color: 'rgba(200,245,240,0.95)',
              border: '1px solid rgba(110,197,184,0.28)',
              borderRadius: 14, padding: '13px 28px',
              fontSize: 13, fontWeight: 600,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif",
              cursor: !loading ? 'pointer' : 'not-allowed',
              opacity: !loading ? 1 : 0.4,
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = '0 10px 40px rgba(60,175,160,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
          >
            {loading ? 'Analyzing...' : files.length === 1 ? 'Read This Space' : `Find the Soundtrack for ${files.length} Photos`}
          </button>
          <button
            onClick={clearAll}
            style={{ background: 'none', border: '1px solid var(--border-input)', color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
          >Clear all</button>
        </div>
      )}

      {loading && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16, letterSpacing: '0.03em' }}>
            {files.length > 1 ? `Reading the story across ${files.length} photos...` : 'Finding the soundtrack hidden in this image...'}
          </div>
          <TrackCardSkeleton count={5} />
        </div>
      )}

      {error && (
        <div>
          <div className="error-banner" style={{ marginBottom: 10 }}>{error}</div>
          {files.length > 0 && (
            <button
              onClick={() => doUpload(files)}
              style={{ background: 'none', border: '1px solid var(--border-input)', color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
            >Try again</button>
          )}
        </div>
      )}

      {result && (
        <div className="fade-in">
          {/* Result header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600,
              background: 'linear-gradient(135deg, #6EC5B8 0%, #A8E6DF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {result.mood_label}
            </span>
            {result.emotional_valence && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 999,
                fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
                background: 'rgba(110,197,184,0.1)', border: '1px solid rgba(110,197,184,0.25)', color: '#6EC5B8',
              }}>{result.emotional_valence}</span>
            )}
            {result.emotional_states?.map(s => (
              <span key={s} style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 999,
                fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
                background: 'rgba(110,197,184,0.07)', border: '1px solid rgba(110,197,184,0.18)', color: 'rgba(110,197,184,0.85)',
              }}>{s}</span>
            ))}
          </div>

          {/* Visual scene — what the AI sees */}
          {result.visual_scene && (
            <div style={{ marginBottom: 14, fontSize: 12.5, color: 'var(--text-faint)', fontStyle: 'italic', lineHeight: 1.65, letterSpacing: '0.01em' }}>
              {result.visual_scene}
            </div>
          )}

          {result.atmosphere && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontStyle: 'italic', color: '#6EC5B8', lineHeight: 1.8, borderLeft: '3px solid rgba(110,197,184,0.35)', paddingLeft: 16, opacity: 0.88 }}>
                "{result.atmosphere}"
              </div>
            </div>
          )}

          {result.story && (
            <div className="result-info-block" style={{ marginBottom: 16 }}>
              <div className="label-micro" style={{ marginBottom: 6 }}>The Story</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.story}</div>
            </div>
          )}

          {result.emotional_amplification && (
            <div className="result-info-block" style={{ marginBottom: 20 }}>
              <div className="label-micro" style={{ marginBottom: 6 }}>What the Music Will Do</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.emotional_amplification}</div>
            </div>
          )}

          {result.imagery_tags?.length && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {result.imagery_tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 999,
                  background: 'rgba(110,197,184,0.07)', border: '1px solid rgba(110,197,184,0.18)',
                  color: 'rgba(110,197,184,0.72)',
                }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Track list header */}
          {result.tracks?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className="label-micro">{result.tracks.length} tracks</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {files.length > 0 && (
                  <button
                    onClick={() => doUpload(files)}
                    title="Re-analyze the same photos"
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)', borderRadius: 7, padding: '5px 10px', fontSize: 13, cursor: 'pointer', lineHeight: 1 }}
                  >↻</button>
                )}
                {onSavePlaylist && (
                  <button
                    onClick={() => onSavePlaylist({ tab: 'environment', label: result.mood_label, input: files.map(f => f.name).join(', '), tracks: result.tracks })}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}
                  >save playlist</button>
                )}
                <button
                  onClick={copyTracks}
                  style={{ background: 'none', border: '1px solid var(--border)', color: copied ? '#6EC5B8' : 'var(--text-faint)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif", transition: 'color 0.2s' }}
                >{copied ? '✓ copied' : 'copy list'}</button>
              </div>
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
