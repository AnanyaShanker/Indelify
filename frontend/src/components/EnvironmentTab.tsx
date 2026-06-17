import { useState, useCallback, useRef } from 'react'
import api, { extractError } from '../api'
import TrackCard from './TrackCard'
import TrackCardSkeleton from './TrackCardSkeleton'
import type { LangPref, EnvironmentResult, HistoryEntry } from '../types'

interface Props {
  langPref: LangPref
  onResult: (entry: Omit<HistoryEntry, 'id' | 'ts'>) => void
}

const MAX_IMAGES = 6

export default function EnvironmentTab({ langPref, onResult }: Props) {
  const [files, setFiles]       = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<EnvironmentResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB per file

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    let incoming = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (!incoming.length) return
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
      return [...prev, ...incoming.slice(0, canAdd).map(f => URL.createObjectURL(f))]
    })
    setResult(null); setError(null)
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i])
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  function clearAll() {
    previews.forEach(p => URL.revokeObjectURL(p))
    setFiles([]); setPreviews([]); setResult(null); setError(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  async function doUpload(currentFiles: File[]) {
    if (!currentFiles.length) return
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
      onResult({ tab: 'environment', label: data.mood_label, input: label, trackCount: data.tracks.length })
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    doUpload(files)
  }

  const canAddMore = files.length < MAX_IMAGES

  return (
    <div>
      <div className="tab-section-header">
        <h2 className="tab-section-title">My Environment</h2>
        <p className="tab-section-desc">Upload photos of your trip or space. Let the moments speak in music.</p>
      </div>

      {files.length === 0 && (
        <div
          className={`drop-zone ${dragging ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{ marginBottom: 16, padding: '44px 24px' }}
        >
          <div style={{
            display: 'inline-flex', width: 72, height: 72, borderRadius: '50%',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(110,197,184,0.18) 0%, rgba(60,155,148,0.07) 55%, transparent 100%)',
            marginBottom: 16, animation: 'pulseGlow 5.5s ease-in-out infinite',
            color: 'rgba(110,197,184,0.60)', fontSize: 28,
          }}>◎</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 6 }}>
            Drag & drop photos here, or click to browse
          </div>
          <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>
            JPG, PNG, WEBP · up to {MAX_IMAGES} photos
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-input)' }}>
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
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-input)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-faint)', fontSize: 13, transition: 'border-color 0.15s',
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
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: 'var(--accent-mid)' }}>
              {result.mood_label}
            </span>
            {result.emotional_valence && <span className="pill" style={{ opacity: 0.7 }}>{result.emotional_valence}</span>}
            {result.emotional_states?.map(s => <span key={s} className="pill">{s}</span>)}
          </div>

          {result.atmosphere && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontStyle: 'italic', color: 'var(--accent-mid)', lineHeight: 1.8, borderLeft: '3px solid var(--quote-border)', paddingLeft: 16 }}>
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
              {result.imagery_tags.map(tag => <span key={tag} className="pill" style={{ fontSize: 12, opacity: 0.65 }}>{tag}</span>)}
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
