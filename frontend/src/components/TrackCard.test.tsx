import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TrackCard from './TrackCard'
import type { Track } from '../types'

const baseTrack: Track = {
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  spotify_url: 'https://open.spotify.com/track/abc',
  album_art: null,
  uri: 'spotify:track:abc',
  preview_url: undefined,
  reason: 'fits the mood',
}

describe('TrackCard preview playback', () => {
  it('does not render an in-page play control when preview_url is null', () => {
    const { queryByLabelText } = render(<TrackCard track={baseTrack} index={0} />)
    expect(queryByLabelText('Play 30s preview')).not.toBeInTheDocument()
  })

  it('renders an in-page play control when preview_url is present', () => {
    const track = { ...baseTrack, preview_url: 'https://example.com/preview.mp3' }
    const { queryByLabelText } = render(<TrackCard track={track} index={0} />)
    expect(queryByLabelText('Play 30s preview')).toBeInTheDocument()
  })

  it('still links out to Spotify regardless of preview availability', () => {
    const { getByText } = render(<TrackCard track={baseTrack} index={0} />)
    const link = getByText('Play').closest('a')
    expect(link).toHaveAttribute('href', baseTrack.spotify_url)
  })
})
