export type LangPref = 'all' | 'hindi-bollywood' | 'english'

export interface Track {
  title: string
  artist: string
  album?: string
  spotify_url?: string
  album_art?: string | null
  genius_url?: string
  reason?: string
  lyric_snippet?: string | null
  match_type?: 'literal' | 'metaphorical' | 'adjacent'
}

export interface HistoryEntry {
  id: number
  tab: string
  label: string
  input: string
  trackCount: number
  ts: number
}

export interface MusicCharacteristics {
  tempo?: string
  energy?: string
  vocal_prominence?: string
  lyrical_density?: string
  danceability?: string
  instrumentation?: string
  emotional_complexity?: string
  acoustic_vs_electronic?: string
  familiarity_preference?: string
  popularity_preference?: string
}

export interface MoodResult {
  mood_label: string
  emotional_valence?: string
  emotional_arousal?: string
  emotional_intensity?: number
  current_state?: string
  desired_state?: string
  situational_context?: string[]
  psychological_intent?: string[]
  imagery?: string[]
  attributes?: string[]
  situation_tags?: string[]
  vibe_tags?: string[]
  music_characteristics?: MusicCharacteristics
  tracks: Track[]
}

export interface EnvironmentResult {
  mood_label: string
  emotional_valence?: string
  emotional_states?: string[]
  atmosphere?: string
  story?: string
  emotional_amplification?: string
  imagery_tags?: string[]
  tracks: Track[]
}

export interface DreamResult {
  mood_label: string
  emotional_residue: string
  symbolic_core?: string[]
  waking_transition_state?: string
  dream_image?: string
  music_attributes?: string[]
  tracks: Track[]
}

export interface LyricsResult {
  theme: string
  literal_meaning: string
  metaphorical_meanings: string[]
  emotional_register: { primary: string; secondary: string }
  search_expansion_terms: string[]
  tracks: Track[]
}
