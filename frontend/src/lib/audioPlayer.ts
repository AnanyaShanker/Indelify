let _stop: (() => void) | null = null

export function playPreview(url: string, onEnd: () => void): () => void {
  _stop?.()
  const audio = new Audio(url)
  const stopThis = () => { audio.pause(); if (_stop === stopThis) _stop = null; onEnd() }
  audio.onended = () => { if (_stop === stopThis) _stop = null; onEnd() }
  audio.play().catch(() => onEnd())
  _stop = stopThis
  return stopThis
}

export function stopAll() {
  _stop?.()
}
