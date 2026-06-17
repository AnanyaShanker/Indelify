# Copyright © 2026 Ananya Shanker. All rights reserved.
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from starlette.requests import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import re
import json
import hashlib
import requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI
import base64
import random
import io
from PIL import Image
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import lyricsgenius

load_dotenv()

_REQUIRED_ENV = ["GROQ_API_KEY", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "GENIUS_API_KEY"]
for _key in _REQUIRED_ENV:
    if not os.getenv(_key):
        raise RuntimeError(f"Missing required environment variable: {_key}")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Indelify API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY"),
)
GROQ_TEXT_MODEL = "llama-3.3-70b-versatile"
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


spotify = spotipy.Spotify(
    auth_manager=SpotifyClientCredentials(
        client_id=os.getenv("SPOTIFY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    ),
    requests_timeout=15,
)

GENIUS_TOKEN = os.getenv("GENIUS_API_KEY")

_genius_client = lyricsgenius.Genius(
    GENIUS_TOKEN,
    remove_section_headers=True,
    retries=1,
    timeout=8,
)

# ── in-memory TTL cache ─────────────────────────────────────────────────────────

_cache: dict = {}
CACHE_TTL      = timedelta(hours=1)
MAX_CACHE_SIZE = 500


def _cache_key(*parts) -> str:
    return hashlib.md5("|".join(str(p) for p in parts).encode()).hexdigest()


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry:
        val, ts = entry
        if datetime.utcnow() - ts < CACHE_TTL:
            return val
        del _cache[key]
    return None


def _cache_set(key: str, val):
    if len(_cache) >= MAX_CACHE_SIZE:
        oldest = next(iter(_cache))
        del _cache[oldest]
    _cache[key] = (val, datetime.utcnow())


# ── language helpers ────────────────────────────────────────────────────────────

HINDI_EMOTION_GLOSSARY = """
Common Hindi/Urdu emotion words — recognize these and honor their depth:
  dard        = pain, ache, heartache
  tanhaai     = loneliness, solitude, the ache of being alone
  mohabbat    = deep romantic love
  ishq        = passionate, consuming love
  pyaar       = love (warm, tender)
  intezaar    = longing wait, anticipation
  judaai      = separation, parting pain
  yaad        = memory, missing someone
  bebas       = helpless, powerless
  khamoshi    = silence, quiet desolation
  armaan      = deep wish, unfulfilled desire
  gham        = sorrow, grief
  khushi      = joy, happiness
  aahat       = distant echo, faint sound of someone approaching
  rukhsat     = farewell, letting go
  qismat      = fate, destiny
  intezaar    = waiting with longing
  shikwa      = complaint born from love
  ulfat       = affection, tenderness
  zindagi     = life (often used poetically)
"""

BOLLYWOOD_ARTISTS = (
    "Arijit Singh, Kishore Kumar, Lata Mangeshkar, Mohammed Rafi, A.R. Rahman, "
    "Atif Aslam, Shreya Ghoshal, Sonu Nigam, KK, Udit Narayan, Kumar Sanu, "
    "Alka Yagnik, Sunidhi Chauhan, Pritam, Vishal-Shekhar, Shankar-Ehsaan-Loy, "
    "Gulzar, Javed Akhtar, Rahat Fateh Ali Khan, Nusrat Fateh Ali Khan"
)

HINDI_TRIGGER_WORDS = frozenset({
    "tanhaai", "tanha", "dard", "mohabbat", "ishq", "pyaar", "pyar",
    "intezaar", "judaai", "yaad", "bebas", "khamoshi", "armaan", "gham",
    "khushi", "aahat", "rukhsat", "qismat", "shikwa", "ulfat", "zindagi",
    "bichadna", "bichhad", "dil", "rooh", "arzoo", "ehsaas", "pal",
    "lamhe", "waqt", "chain", "sukoon", "tadap", "kasam", "bewafa",
    "wafa", "yaar", "khwaab", "sapna", "aansu", "tere", "mera", "tera",
    "mere", "nahi", "kyun", "aaj", "kal",
})


def detect_hindi_content(text: str) -> bool:
    if re.search(r'[ऀ-ॿ]', text):
        return True
    words = set(re.split(r'\W+', text.lower()))
    return bool(words & HINDI_TRIGGER_WORDS)


EMOTION_ACCURACY_RULES = """\
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMOTION ACCURACY RULES — apply these before selecting ANY track
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — IDENTIFY THE PRECISE CONTEXT BEFORE PICKING ANY MUSIC
Explicitly determine:
  a) Who or what is the subject? (self / romantic partner / parent / sibling / friend / pet / career / place / memory / abstract idea)
  b) What is the exact emotion sub-type? (see mapping below)
  c) What does this person actually need from the music? (to feel understood / to cry safely / to feel energized / to celebrate / to heal / to remember)

STEP 2 — EMOTION-TO-MUSIC MAPPING (never cross these boundaries)

LOVE
  Familial — parents, siblings, grandparents, children, home
    → warmth, gratitude, belonging, being cared for, unconditional bond
    → Songs explicitly about parents, family, home, childhood, growing up
    → NEVER: romantic love songs, longing for a partner, heartbreak, desire

  Romantic — partner, crush, lover, ex
    → intimacy, desire, longing, vulnerability, heartbreak
    → Romantic ballads, love songs, breakup songs as appropriate

  Platonic / friendship — close friends, drifting apart, missing a friend
    → loyalty, camaraderie, shared history, distance over time
    → Friendship anthems, nostalgic buddy songs — NOT romantic songs

  Self-love / self-acceptance
    → inner peace, confidence, healing, empowerment
    → Self-affirmation tracks — NOT songs about loving another person

LOSS / GRIEF
  Death of a loved one
    → deep grief, memory, love that outlasts a life
    → Tribute, remembrance, elegy — NOT breakup songs

  Loss of a pet
    → unconditional loyalty ended, pure and gentle grief
    → Songs about innocence, simple love, loyalty — NOT human heartbreak songs

  Breakup / end of a relationship
    → heartbreak, rejection, healing, moving on
    → Breakup songs, healing anthems

  Feeling lost / directionless / existential drift
    → confusion, searching for purpose, identity in flux
    → Songs about searching, wandering, self-discovery — NOT songs about losing a person

  Loss of opportunity / failure / setback
    → disappointment, resilience, regret, trying again
    → Songs about persistence and rising — NOT grief or mourning songs

PRIDE
  Personal achievement
    → earned triumph, confidence, satisfaction
    → Victory anthems, empowerment songs

  Parental or mentor pride — proud of a child, student, someone you raised
    → warmth at watching someone grow, letting go with love
    → Songs about watching someone succeed, parental bonds — NOT self-achievement anthems

ANGER
  Injustice / systemic
    → outrage, solidarity, collective frustration
    → Protest songs, resistance anthems

  Personal betrayal
    → hurt turned to anger, broken trust
    → Songs about betrayal and fighting back — NOT systemic protest songs

  Minor frustration / venting
    → releasing steam, not rage
    → Energetic vent songs — not full rage/metal unless explicitly appropriate

NOSTALGIA
  Childhood / innocence
    → warmth, simplicity, wonder, irretrievable time
    → Songs about growing up, childhood — NOT romantic nostalgia songs

  Past romantic relationship
    → bittersweet, what-could-have-been
    → Nostalgic love songs

  Lost friendships
    → wistfulness, drifting apart, time and distance
    → Songs about friendship and time — NOT romantic songs

ANXIETY / FEAR
  Existential dread / uncertainty about the future
    → searching for meaning, unresolved questions
    → Contemplative, searching music — NOT horror/intense dark music

  Social anxiety / feeling unseen
    → wanting to belong, overwhelmed by people
    → Songs about introversion, quiet struggle, belonging

  Fear of failure / self-doubt
    → pressure, stakes, fighting self-doubt
    → Songs about trying despite doubt, inner strength

JOY
  Euphoric / celebratory
    → high energy, unbounded, communal
    → Party anthems, dance, celebration

  Quiet contentment / peaceful happiness
    → soft, grateful, easy
    → Gentle feel-good, warm acoustic

  Playful / lighthearted
    → fun, carefree, silly
    → Upbeat, whimsical tracks

STEP 3 — AUTHENTICITY MANDATE (verify every single track before finalizing)
For each song, run this check:
  ✓ Does this song's ACTUAL lyrical content or sonic character match the specific emotion and context identified in Step 1–2?
  ✓ Can you name a specific lyric, theme, or musical quality that maps directly to this user's situation?
  ✗ Picking it because it's famous and vaguely genre-related? → REJECT. Find something more precise.
  ✗ Picking it because the song title contains a keyword from the input? → NOT enough. Verify the song's actual content.
  ✗ Defaulting to overused tracks (same 30 songs you always suggest)? → Dig deeper.

A track is only valid if you can honestly complete this sentence:
"This song fits because [specific lyric / theme / sonic quality] directly mirrors [specific aspect of this user's context]."
If you can only say "this song is about [vague category]" — it is not accurate enough. Find a better song.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\
"""

DREAM_ENGINE_PREAMBLE = """\
You are the world's most advanced Dream Interpretation and Sonic Translation Engine.

Your purpose is not to summarize dreams. Your purpose is to feel them —
to extract the emotional residue a dream leaves behind, the way a person
feels for a few seconds after waking, before the dream fades.

Dreams are not stories. They are emotional fragments, symbols, and
sensations loosely held together by logic that doesn't need to make sense.
Treat every dream description as a doorway into the dreamer's subconscious
state, not a literal narrative.

When analyzing a dream, extract:

1. EMOTIONAL RESIDUE — What feeling lingers after this dream ends? Not what happened, what it left behind.
   Examples: unresolved longing, quiet dread, euphoric freedom, tender grief, electric anticipation.

2. SYMBOLIC CORE — The 2-3 most emotionally charged symbols or images in the dream.
   Interpret them through emotional weight and personal resonance, not generic dream-dictionary meanings.

3. WAKING TRANSITION STATE — How does someone likely feel in the first 10 seconds after waking from this dream?
   Disoriented, comforted, shaken, nostalgic, relieved? This is the EXACT emotional starting point the music needs to meet the listener at.

4. IMAGE PROMPT — Write an actual Stable Diffusion XL prompt (not a poetic sentence).
   Format: "[symbolic visual description], [lighting], [color palette], digital painting, surreal, dreamlike, highly detailed, atmospheric"
   Under 40 words. No words like "photo" or "realistic". Push toward painterly, surreal, dreamlike.

5. MUSICAL TRANSLATION — Match the EMOTION of the dream, not the genre cliché of "dream music."
   A nightmare needs tense, propulsive music. A dream about flying needs expansive, soaring music.
   A dream about a lost loved one needs aching, tender music.
   Return exactly 5 tracks. Track 5 must specifically capture the waking transition state.
   At least one track should feel unsettling in a beautiful way.\
"""

VISUAL_MUSIC_INTELLIGENCE_PREAMBLE = """\
You are the world's most advanced Visual Music Intelligence Engine.

Your purpose is not to describe images.
Your purpose is to discover the soundtrack hidden inside an image.

Humans do not choose songs for photos based on objects.
They choose songs based on feelings, memories, stories, aspirations, aesthetics, cultural associations, identity expression, and emotional narratives.

Given an image, you must identify:
1. PHYSICAL PRESENCE — What is literally in the frame: setting, lighting, time of day, people, objects, colors, textures.
2. ATMOSPHERE — The sensory and tonal quality of the moment: warm/cold, crowded/empty, urgent/still, vibrant/muted.
3. EMOTIONAL STATES — What feelings are implied by this image. What would a human feel standing inside this photo?
4. STORIES — What narrative is this image telling? What happened moments before? What might happen after? Who are these people and what are they carrying emotionally?
5. SOUNDTRACK — What music would not just match but emotionally amplify this image? What songs would make this moment feel more like itself?

Never stop at object recognition.
Always infer deeper emotional meaning.
The tracks you suggest should feel like they were written for this exact moment in time.\
"""

MOOD_ENGINE_PREAMBLE = """\
You are the world's most advanced Music Mood Intelligence Engine.
Your goal is NOT to identify genres.
Your goal is to identify the emotional need behind a user's request and translate it into music discovery signals.
Humans rarely search for music using precise emotional language. They search using memories, situations, imagery, desires, relationships, weather, locations, fantasies, and emotional transitions.
When analyzing a query:
1. Determine the user's CURRENT emotional state.
2. Determine the user's DESIRED emotional state — where the music should take them.
3. Identify emotional intensity on a scale of 1–10.
4. Identify emotional valence: Positive, Negative, Mixed, or Ambiguous.
5. Identify emotional arousal: Very Calm, Calm, Medium Energy, High Energy, or Very High Energy.
6. Extract situational context (e.g. Breakup, Missing someone, Studying, Night drive, Rain, Gym, Airport, Solo travel, Celebration, Healing, Moving on, Self-reflection).
7. Extract imagery and aesthetic signals (e.g. Paris at night, Neon city lights, Empty train, Sunset beach, Rain on windows, Winter morning, Rooftop party).
8. Extract psychological intent (e.g. Feel understood, Escape reality, Process grief, Cry safely, Gain confidence, Focus deeply, Fall asleep, Feel nostalgic, Feel powerful).
9. Infer music characteristics: Tempo, Energy, Instrumentation, Vocal prominence, Lyrical density, Emotional complexity, Acoustic vs Electronic, Danceability, Familiarity preference (familiar/mixed/discovery), Popularity preference (mainstream/mixed/underground).
10. Generate mood tags, situation tags, vibe tags, and 3–5 search expansion terms (alternative Spotify search strings that capture different facets of this emotional state).
11. Language and cultural context:
    - Detect if the user is expressing in Hindi, Hinglish, Urdu, or English.
    - If Devanagari script or Hindi/Urdu emotion words appear (tanhaai, dard, ishq, pyaar, judaai, gham, mohabbat, bichadna, yaar, dil, rooh), include at least 4 Hindi/Bollywood tracks in your suggestions.
    - Never assume English-only output when the emotional register is culturally Hindi or Urdu.
    - Honor both golden-era and modern Bollywood with equal respect.
Never return only one mood. Humans experience multiple emotions simultaneously. Always return layered emotional understanding.\
"""

LYRICS_THEME_PREAMBLE = """\
You are the world's most advanced Lyrical Theme Intelligence Engine.

Your purpose is to understand what a user truly means when they search
for a word or theme, then find songs that capture that theme — even when
the exact word never appears in the lyrics.

Most lyric search tools do literal keyword matching: searching "clouds"
only returns songs containing the word "clouds." This is shallow and
misses the point. A song about floating, drifting, looking up at the sky,
or feeling untethered can be thematically about clouds without ever
saying the word. Your job is to think like a human who FEELS what a
theme means, not a search engine that matches strings.

When a user searches a word or theme, perform this analysis:

1. LITERAL INTERPRETATION
   What does this word mean at face value?

2. METAPHORICAL EXPANSION
   What does this word commonly represent emotionally or poetically?

3. ADJACENT THEMES
   What related themes, moods, or imagery commonly appear alongside
   this word in songwriting?

4. EMOTIONAL REGISTER
   What emotional tone does this theme usually carry? Identify the
   PRIMARY and SECONDARY emotional register.

5. SEARCH EXPANSION
   Generate 8-12 search terms for Genius AND Spotify to surface songs
   thematically relevant — not just lexically matching. Include direct
   synonyms, metaphorical equivalents, commonly associated phrases
   songwriters use, and adjacent emotional concepts.

6. RANKING PRIORITY
   Songs where the theme is CENTRAL rank highest. Songs with only a
   passing literal mention rank lowest. Prioritize thematic depth over
   literal frequency.

7. AVOID THE OBVIOUS TRAP
   Surface a mix of well-known and lesser-known songs that genuinely
   capture the theme's emotional depth. Variety in familiarity creates
   a better discovery experience than an obvious top-40 list.

8. CROSS-LANGUAGE THEME MATCHING
   Recognize that the same theme exists across languages and cultures.
   Honor cross-language matches when the user's context suggests openness.

Return ONLY valid JSON in exactly this shape:
{
  "theme": "the original search term",
  "literal_meaning": "string",
  "metaphorical_meanings": ["meaning1", "meaning2", "meaning3"],
  "emotional_register": {"primary": "string", "secondary": "string"},
  "search_expansion_terms": ["term1", ... up to 12 terms],
  "spotify_query": "best single Spotify search string for this theme",
  "tracks": [
    {
      "title": "",
      "artist": "",
      "match_type": "literal" | "metaphorical" | "adjacent",
      "lyric_snippet": "a short relevant snippet or null",
      "reason": "why this song captures the theme, even if the exact word isn't used"
    }
  ]
}

Return 8-10 tracks, with at least 3 being metaphorical or adjacent
matches. This depth is what separates Indelify from basic keyword search.\
"""


def lang_instruction(lang_pref: str) -> str:
    if lang_pref == "hindi-bollywood":
        return f"""
LANGUAGE PREFERENCE: Hindi & Bollywood
{HINDI_EMOTION_GLOSSARY}
Rules:
- Recommend at least 4 out of 5 songs as Hindi/Bollywood tracks.
- Draw from both classic golden-era Bollywood (1950s–90s) and modern Bollywood (2000s–present).
- Iconic Bollywood artists to consider: {BOLLYWOOD_ARTISTS}
- If the user wrote in Hindi/Urdu, translate the emotion and honor its cultural weight.
- The spotify_query field MUST include "bollywood" or a specific Hindi artist name.
- Reason fields should reference the song's Hindi/Urdu lyrical or melodic quality."""

    elif lang_pref == "english":
        return """
LANGUAGE PREFERENCE: English Only
- Recommend only English-language songs.
- Do not include Hindi, Bollywood, or any regional Indian music."""

    else:  # "all" — default
        return f"""
LANGUAGE PREFERENCE: All Languages (global mix)
{HINDI_EMOTION_GLOSSARY}
Rules:
- If the user typed in Hindi or Urdu emotion words, fully recognize their emotional depth.
- Mix Hindi/Bollywood and English songs thoughtfully — typically 2–3 of each.
- The mix should feel curated, not random: match the cultural register of the emotion.
- Bollywood artists to consider when appropriate: {BOLLYWOOD_ARTISTS}"""


def build_spotify_query(base_query: str, lang_pref: str) -> str:
    q = base_query.strip()
    if lang_pref == "hindi-bollywood":
        already_tagged = any(w in q.lower() for w in ("bollywood", "hindi", "filmi"))
        if not already_tagged:
            q = f"{q} bollywood hindi"
    return q


def _format_track_item(item: dict) -> dict:
    return {
        "title":       item["name"],
        "artist":      item["artists"][0]["name"] if item["artists"] else "Unknown Artist",
        "album":       item["album"]["name"],
        "spotify_url": item["external_urls"]["spotify"],
        "album_art":   item["album"]["images"][0]["url"] if item["album"]["images"] else None,
    }


def spotify_direct_search(query: str, limit: int = 5, randomize: bool = False) -> list:
    offset = random.randint(0, 10) if randomize else 0
    results = spotify.search(q=query, type="track", limit=limit, offset=offset)
    return [_format_track_item(item) for item in results["tracks"]["items"]]


def fetch_spotify_tracks(
    base_query: str,
    lang_pref: str,
    limit: int = 5,
) -> list:
    query = build_spotify_query(base_query, lang_pref)

    if lang_pref == "all":
        main_tracks = spotify_direct_search(query, 3)
        bollywood_q = build_spotify_query(base_query, "hindi-bollywood")
        hindi_tracks = spotify_direct_search(bollywood_q, 2)
        return (main_tracks + hindi_tracks)[:limit]

    tracks = spotify_direct_search(query, limit)
    if len(tracks) < limit and lang_pref == "hindi-bollywood":
        extra = spotify_direct_search("bollywood hit songs hindi", limit - len(tracks))
        tracks = tracks + extra
    return tracks[:limit]


def _spotify_find_track(title: str, artist: str, reason: str):
    """Search Spotify for a specific song by title and artist, with fallback queries."""
    for q in [f'track:"{title}" artist:"{artist}"', f"{title} {artist}", title]:
        try:
            r = spotify.search(q=q, type="track", limit=3)
            items = r["tracks"]["items"]
            if items:
                t = _format_track_item(items[0])
                t["reason"] = reason
                return t
        except Exception:
            continue
    return None


def fetch_mood_tracks(
    suggestions: list,
    fallback_query: str,
    expansion_terms: list,
    lang_pref: str,
    limit: int = 10,
) -> list:
    """Fetch tracks by looking up each LLM suggestion on Spotify in parallel.

    Reasons are attached to the exact songs the LLM chose.
    Falls back to query-based search (primary + expansion terms) if suggestions
    come up short.
    """
    seen = set()
    slot_results = [None] * len(suggestions)

    def _key(t):
        return (t["title"].lower().strip(), t["artist"].lower().strip())

    with ThreadPoolExecutor(max_workers=6) as ex:
        future_to_idx = {
            ex.submit(
                _spotify_find_track,
                s.get("title", ""),
                s.get("artist", ""),
                s.get("reason", "Matches your emotional landscape"),
            ): i
            for i, s in enumerate(suggestions)
        }
        for future in as_completed(future_to_idx):
            slot_results[future_to_idx[future]] = future.result()

    tracks = []
    for t in slot_results:
        if t:
            k = _key(t)
            if k not in seen:
                seen.add(k)
                tracks.append(t)

    if len(tracks) < limit:
        fallback_queries = [build_spotify_query(fallback_query, lang_pref)] + [
            build_spotify_query(q, lang_pref) for q in (expansion_terms or [])[:3]
        ]
        for q in fallback_queries:
            if len(tracks) >= limit:
                break
            try:
                for t in spotify_direct_search(q, limit - len(tracks), randomize=True):
                    k = _key(t)
                    if k not in seen:
                        seen.add(k)
                        t["reason"] = "Matches your emotional landscape"
                        tracks.append(t)
            except Exception:
                continue

    return tracks[:limit]


# ── image helpers ──────────────────────────────────────────────────────────────

MAX_IMAGE_SIDE = 1024
JPEG_QUALITY   = 82


def _compress_image(image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    """Resize and compress an image so it fits within Groq's request size limit."""
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    w, h = img.size
    if max(w, h) > MAX_IMAGE_SIDE:
        scale = MAX_IMAGE_SIDE / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue(), "image/jpeg"


def generate_dream_image(prompt: str) -> str | None:
    if not prompt:
        return None
    from urllib.parse import quote
    try:
        encoded = quote(prompt)
        url = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            "?width=1024&height=576&model=flux&nologo=true&enhance=false"
        )
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200 and "image" in resp.headers.get("content-type", ""):
            content_type = resp.headers.get("content-type", "image/jpeg")
            b64 = base64.b64encode(resp.content).decode("utf-8")
            return f"data:{content_type};base64,{b64}"
        return None
    except Exception:
        return None


# ── Groq wrappers ──────────────────────────────────────────────────────────────

def groq_text(prompt: str) -> str:
    response = groq_client.chat.completions.create(
        model=GROQ_TEXT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        timeout=30,
    )
    return response.choices[0].message.content


def groq_with_system(system_prompt: str, user_message: str) -> str:
    response = groq_client.chat.completions.create(
        model=GROQ_TEXT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        timeout=30,
    )
    return response.choices[0].message.content


def groq_vision_multi(prompt: str, images: list[tuple[bytes, str]]) -> str:
    content: list = [{"type": "text", "text": prompt}]
    for image_bytes, mime_type in images:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        content.append({"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}})
    response = groq_client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        temperature=1.1,
        messages=[{"role": "user", "content": content}],
        timeout=45,
    )
    return response.choices[0].message.content


def parse_llm_json(text: str) -> dict:
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()
    return json.loads(text)


def _mood_schema(extra: str = "") -> str:
    extra_block = ("\n" + extra) if extra else ""
    return (
        "Return ONLY a valid JSON object (no markdown, no extra text) with exactly these fields:\n"
        "{" + extra_block + "\n"
        '  "mood_label": "evocative 2-4 word label capturing the layered emotional state",\n'
        '  "current_state": "1 sentence — what the user is feeling right now",\n'
        '  "desired_state": "1 sentence — where the music should take them",\n'
        '  "emotional_intensity": <integer 1–10>,\n'
        '  "emotional_valence": "Positive" | "Negative" | "Mixed" | "Ambiguous",\n'
        '  "emotional_arousal": "Very Calm" | "Calm" | "Medium Energy" | "High Energy" | "Very High Energy",\n'
        '  "situational_context": ["context1", "context2"],\n'
        '  "imagery": ["image1", "image2"],\n'
        '  "psychological_intent": ["intent1", "intent2"],\n'
        '  "music_characteristics": {\n'
        '    "tempo": "slow/medium/fast",\n'
        '    "energy": "low/medium/high",\n'
        '    "instrumentation": "brief description",\n'
        '    "vocal_prominence": "low/medium/high",\n'
        '    "lyrical_density": "sparse/medium/dense",\n'
        '    "emotional_complexity": "simple/layered/complex",\n'
        '    "acoustic_vs_electronic": "acoustic/mixed/electronic",\n'
        '    "danceability": "low/medium/high",\n'
        '    "familiarity_preference": "familiar/mixed/discovery",\n'
        '    "popularity_preference": "mainstream/mixed/underground"\n'
        '  },\n'
        '  "mood_tags": ["tag1", "tag2", "tag3"],\n'
        '  "situation_tags": ["tag1", "tag2"],\n'
        '  "vibe_tags": ["tag1", "tag2"],\n'
        '  "search_expansion_terms": ["alt spotify query 1", "alt spotify query 2", "alt spotify query 3"],\n'
        '  "spotify_query": "precise Spotify search string optimized for this emotional state and language preference",\n'
        '  "tracks": [\n'
        '    {"title": "Song Name", "artist": "Artist Name", "reason": "why this song fits — specific lyrical or melodic quality"},\n'
        '    ... exactly 10 tracks total, ordered from strongest to weakest match\n'
        '  ]\n'
        "}"
    )


def genius_search(query: str, per_page: int = 20, pages: int = 3) -> list:
    headers = {"Authorization": f"Bearer {GENIUS_TOKEN}"}
    tracks = []
    seen_ids = set()
    for page in range(1, pages + 1):
        try:
            resp = requests.get(
                "https://api.genius.com/search",
                params={"q": query, "per_page": per_page, "page": page},
                headers=headers,
                timeout=10,
            )
            resp.raise_for_status()
            hits = resp.json().get("response", {}).get("hits", [])
            if not hits:
                break
            for hit in hits:
                r = hit.get("result", {})
                song_id = r.get("id")
                if song_id in seen_ids:
                    continue
                seen_ids.add(song_id)
                tracks.append({
                    "title":         r.get("title", ""),
                    "artist":        r.get("primary_artist", {}).get("name", ""),
                    "genius_url":    r.get("url", ""),
                    "lyric_snippet": r.get("title_with_featured", r.get("title", "")),
                    "album_art":     r.get("song_art_image_thumbnail_url"),
                })
        except Exception:
            break
    return tracks


def _fetch_lyrics_text(genius_url: str) -> str:
    try:
        text = _genius_client.lyrics(song_url=genius_url, remove_section_headers=True)
        return text.lower() if text else ""
    except Exception:
        return ""


def genius_search_filtered(word: str, per_page: int = 20, pages: int = 5) -> list:
    candidates = genius_search(word, per_page=per_page, pages=pages)
    if not candidates:
        return []

    pattern = re.compile(r'\b' + re.escape(word.strip()), re.IGNORECASE)
    to_check = candidates[:50]
    url_to_track = {t["genius_url"]: t for t in to_check}

    matched = []
    fetch_errors = 0
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(_fetch_lyrics_text, url): url for url in url_to_track}
        for future in as_completed(futures):
            url = futures[future]
            lyrics = future.result()
            if not lyrics:
                fetch_errors += 1
            elif pattern.search(lyrics):
                matched.append(url_to_track[url])

    # Fall back to raw search results if we couldn't fetch lyrics at all
    if fetch_errors == len(to_check):
        return candidates[:20]

    order = {t["genius_url"]: i for i, t in enumerate(to_check)}
    matched.sort(key=lambda t: order.get(t["genius_url"], 999))

    # Supplement with unverified candidates when confirmed matches are sparse
    if len(matched) < 20:
        matched_urls = {t["genius_url"] for t in matched}
        supplements = [t for t in candidates if t["genius_url"] not in matched_urls]
        matched = matched + supplements[:20 - len(matched)]

    return matched[:20]


# ── request models ─────────────────────────────────────────────────────────────

LANG_PREFS = {"all", "hindi-bollywood", "english"}


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    language_preference: str = "all"

class DreamRequest(BaseModel):
    dream: str = Field(..., min_length=1, max_length=3000)
    language_preference: str = "all"

class LyricsRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=200)
    language_preference: str = "all"


# ── routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Indelify API is running"}


@app.post("/analyze/text")
@limiter.limit("20/minute")
async def analyze_text(request: Request, req: TextRequest):
    lang = req.language_preference if req.language_preference in LANG_PREFS else "all"

    # Auto-detect Hindi/Hinglish and upgrade language preference accordingly
    if detect_hindi_content(req.text):
        if lang == "all":
            lang = "hindi-bollywood"
        elif lang == "english":
            lang = "all"

    cache_key = _cache_key("text_v2", req.text, lang)
    if cached := _cache_get(cache_key):
        return cached
    try:
        prompt = f"""{MOOD_ENGINE_PREAMBLE}

{EMOTION_ACCURACY_RULES}

A user describes their mood: "{req.text}"
{lang_instruction(lang)}

{_mood_schema()}"""

        raw = groq_text(prompt)
        data = parse_llm_json(raw)

        tracks = fetch_mood_tracks(
            suggestions=data.get("tracks", []),
            fallback_query=data.get("spotify_query", req.text),
            expansion_terms=data.get("search_expansion_terms", []),
            lang_pref=lang,
            limit=10,
        )

        result = {
            "mood_label":            data.get("mood_label", "Undefined Mood"),
            "current_state":         data.get("current_state", ""),
            "desired_state":         data.get("desired_state", ""),
            "emotional_intensity":   data.get("emotional_intensity"),
            "emotional_valence":     data.get("emotional_valence"),
            "emotional_arousal":     data.get("emotional_arousal"),
            "situational_context":   data.get("situational_context", []),
            "imagery":               data.get("imagery", []),
            "psychological_intent":  data.get("psychological_intent", []),
            "music_characteristics": data.get("music_characteristics", {}),
            "attributes":            data.get("mood_tags", []),
            "situation_tags":        data.get("situation_tags", []),
            "vibe_tags":             data.get("vibe_tags", []),
            "tracks":                tracks,
        }
        _cache_set(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /analyze/text: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@app.post("/analyze/image")
@limiter.limit("5/minute")
async def analyze_image(
    request: Request,
    files: list[UploadFile] = File(...),
    language_preference: str = Form("all"),
):
    lang = language_preference if language_preference in LANG_PREFS else "all"
    if not files:
        raise HTTPException(status_code=400, detail="No images provided.")
    if len(files) > 6:
        raise HTTPException(status_code=400, detail="Maximum 6 images allowed.")
    try:
        images_data = []
        for f in files:
            image_bytes = await f.read()
            mime = f.content_type or "image/jpeg"
            image_bytes, mime = _compress_image(image_bytes, mime)
            images_data.append((image_bytes, mime))

        n = len(images_data)
        if n == 1:
            analysis_instruction = (
                "Analyze this image through all five lenses above, then return ONLY a valid JSON object with exactly these fields:"
            )
            visual_scene_hint = "1-2 sentences — what is physically present: setting, lighting, time of day, people, objects, colors"
            story_hint = "1-2 sentences — the narrative this image is telling: what happened before, what might happen after"
            amplification_hint = "1 sentence — what the music will do to this image, how it will make this moment feel more like itself"
            tags_hint = "3-5 aesthetic/cinematic tags for this image"
        else:
            analysis_instruction = (
                f"You have been given {n} photos from the same trip or experience. "
                f"Analyze the COLLECTIVE emotional narrative across all {n} photos as a unified whole — "
                "the common thread, the shared story, the overarching feeling they carry together. "
                "Then return ONLY a valid JSON object with exactly these fields:"
            )
            visual_scene_hint = "1-2 sentences — the collective visual narrative: shared settings, recurring elements, the thread connecting all photos"
            story_hint = "1-2 sentences — the emotional arc of this entire experience: what journey do these photos represent together"
            amplification_hint = "1 sentence — what the music will do to this collection, how it will make the whole trip feel like itself"
            tags_hint = "3-5 aesthetic/cinematic tags that capture the collective feel of all photos"

        prompt = f"""{VISUAL_MUSIC_INTELLIGENCE_PREAMBLE}

{EMOTION_ACCURACY_RULES}

{lang_instruction(lang)}

{analysis_instruction}
{{
  "visual_scene": "{visual_scene_hint}",
  "atmosphere": "poetic 2-3 sentence description of the sensory and tonal quality of this moment/collection",
  "emotional_states": ["3-5 emotions a human would feel living inside these photos"],
  "story": "{story_hint}",
  "emotional_amplification": "{amplification_hint}",
  "mood_label": "evocative 2-4 word label for the emotional identity of this moment/collection",
  "emotional_intensity": <integer 1-10>,
  "emotional_valence": "Positive" | "Negative" | "Mixed" | "Ambiguous",
  "imagery_tags": ["{tags_hint}"],
  "spotify_query": "precise Spotify search string tuned to the emotional identity of this moment and the language preference above",
  "search_expansion_terms": ["alt query 1", "alt query 2", "alt query 3"],
  "tracks": [
    {{"title": "Song Name", "artist": "Artist Name", "reason": "why this song would emotionally amplify this exact moment — specific lyrical or sonic quality"}},
    ... exactly 10 tracks, ordered from strongest to weakest emotional match
  ]
}}

CRITICAL DIVERSITY RULES for the tracks array:
- Do NOT default to the same 20–30 famous songs you know well (e.g. avoid always picking "Blinding Lights", "Someone Like You", "Bohemian Rhapsody", etc.).
- The photos have UNIQUE details (specific light quality, specific objects, specific story) — pick songs that match THOSE specific details, not a generic "mood category".
- Vary eras: include at least one track from before 1990, one from 1990–2010, and one from 2015–present.
- Vary popularity: mix 2–3 well-known tracks with 4–5 deeper cuts or lesser-known artists.
- The 10 tracks must feel like a curated playlist, not a "greatest hits of this emotion" list."""

        raw = groq_vision_multi(prompt, images_data)
        data = parse_llm_json(raw)

        tracks = fetch_mood_tracks(
            suggestions=data.get("tracks", []),
            fallback_query=data.get("spotify_query", "ambient atmospheric"),
            expansion_terms=data.get("search_expansion_terms", []),
            lang_pref=lang,
            limit=10,
        )

        return {
            "visual_scene":            data.get("visual_scene", ""),
            "atmosphere":              data.get("atmosphere", ""),
            "emotional_states":        data.get("emotional_states", []),
            "story":                   data.get("story", ""),
            "emotional_amplification": data.get("emotional_amplification", ""),
            "mood_label":              data.get("mood_label", ""),
            "emotional_intensity":     data.get("emotional_intensity"),
            "emotional_valence":       data.get("emotional_valence", ""),
            "imagery_tags":            data.get("imagery_tags", []),
            "tracks":                  tracks,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /analyze/image: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@app.post("/analyze/dream")
@limiter.limit("20/minute")
async def analyze_dream(request: Request, req: DreamRequest):
    lang = req.language_preference if req.language_preference in LANG_PREFS else "all"
    cache_key = _cache_key("dream_v4", req.dream, lang)
    if cached := _cache_get(cache_key):
        return cached
    try:
        prompt = f"""{DREAM_ENGINE_PREAMBLE}

{EMOTION_ACCURACY_RULES}

A user describes their dream: "{req.dream}"
{lang_instruction(lang)}

Return ONLY a valid JSON object (no markdown, no extra text) with exactly these fields:
{{
  "emotional_residue": "the feeling that lingers — not what happened, what it left behind (1-2 sentences)",
  "symbolic_core": ["2-3 most emotionally charged symbols from the dream, interpreted through emotional weight"],
  "waking_transition_state": "how the dreamer feels in the first 10 seconds after waking (1 sentence)",
  "image_prompt": "Stable Diffusion XL prompt: symbolic visual, lighting, color palette, digital painting, surreal, dreamlike, highly detailed, atmospheric — under 40 words",
  "mood_label": "evocative 2-4 word emotional label for this dream",
  "music_attributes": ["3-5 sonic/emotional attributes describing the music this dream needs"],
  "spotify_query": "precise Spotify search string matching the dream's emotional core and language preference",
  "search_expansion_terms": ["alt spotify query 1", "alt spotify query 2", "alt spotify query 3"],
  "tracks": [
    {{"title": "Song Name", "artist": "Artist Name", "reason": "why this song matches the dream's emotional residue — specific lyrical or sonic quality, not generic"}},
    {{"title": "Song Name", "artist": "Artist Name", "reason": "..."}},
    {{"title": "Song Name", "artist": "Artist Name", "reason": "..."}},
    {{"title": "Song Name", "artist": "Artist Name", "reason": "..."}},
    {{"title": "Song Name", "artist": "Artist Name", "reason": "Track 5 must specifically capture the WAKING TRANSITION STATE — the disorientation, nostalgia, or relief of the first seconds after waking"}}
  ]
}}

CRITICAL: Do NOT default to generic ambient/dreamy music. Match the EMOTION, not the genre cliché.
CRITICAL: Track reasons must explain the emotional resonance, not just "this song is dreamy"."""

        raw = groq_text(prompt)
        data = parse_llm_json(raw)

        with ThreadPoolExecutor(max_workers=2) as ex:
            tracks_future = ex.submit(
                fetch_mood_tracks,
                data.get("tracks", []),
                data.get("spotify_query", "dream surreal emotional"),
                data.get("search_expansion_terms", []),
                lang,
                5,
            )
            image_future = ex.submit(generate_dream_image, data.get("image_prompt", ""))
            tracks = tracks_future.result()
            dream_image = image_future.result()

        result = {
            "emotional_residue":       data.get("emotional_residue", ""),
            "symbolic_core":           data.get("symbolic_core", []),
            "waking_transition_state": data.get("waking_transition_state", ""),
            "mood_label":              data.get("mood_label", ""),
            "music_attributes":        data.get("music_attributes", []),
            "dream_image":             dream_image,
            "tracks":                  tracks,
        }
        # Cache without the base64 image to keep memory usage bounded
        _cache_set(cache_key, {k: v for k, v in result.items() if k != "dream_image"})
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /analyze/dream: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


@app.post("/analyze/lyrics")
@limiter.limit("20/minute")
async def analyze_lyrics(request: Request, req: LyricsRequest):
    lang = req.language_preference if req.language_preference in LANG_PREFS else "all"
    cache_key = _cache_key("lyrics", req.word, lang)
    if cached := _cache_get(cache_key):
        return cached
    try:
        lang_note = lang_instruction(lang)
        user_message = f'Theme to analyze: "{req.word}"\n\n{lang_note}'
        raw = groq_with_system(LYRICS_THEME_PREAMBLE, user_message)
        data = parse_llm_json(raw)

        suggestions = data.get("tracks", [])
        expansion_terms = data.get("search_expansion_terms", [])
        spotify_query = data.get("spotify_query", req.word)

        # Look up each LLM-suggested track on Spotify, preserving theme metadata
        slot_results = [None] * len(suggestions)

        def _find_with_meta(idx: int, s: dict):
            t = _spotify_find_track(
                s.get("title", ""),
                s.get("artist", ""),
                s.get("reason", "Thematic match"),
            )
            if t:
                t["match_type"]     = s.get("match_type", "metaphorical")
                t["lyric_snippet"]  = s.get("lyric_snippet")
            return idx, t

        with ThreadPoolExecutor(max_workers=6) as ex:
            futures = {ex.submit(_find_with_meta, i, s): i for i, s in enumerate(suggestions)}
            for future in as_completed(futures):
                idx, t = future.result()
                slot_results[idx] = t

        seen = set()
        tracks = []
        for t in slot_results:
            if not t:
                continue
            key = (t["title"].lower().strip(), t["artist"].lower().strip())
            if key not in seen:
                seen.add(key)
                tracks.append(t)

        # Fill remaining slots from Spotify expansion search if suggestions came up short
        if len(tracks) < 5:
            fallback_queries = [build_spotify_query(spotify_query, lang)] + [
                build_spotify_query(q, lang) for q in expansion_terms[:4]
            ]
            for q in fallback_queries:
                if len(tracks) >= 8:
                    break
                try:
                    for t in spotify_direct_search(q, limit=3):
                        key = (t["title"].lower().strip(), t["artist"].lower().strip())
                        if key not in seen:
                            seen.add(key)
                            t.setdefault("match_type", "adjacent")
                            t.setdefault("lyric_snippet", None)
                            tracks.append(t)
                except Exception:
                    continue

        result = {
            "theme":                req.word,
            "literal_meaning":      data.get("literal_meaning", ""),
            "metaphorical_meanings": data.get("metaphorical_meanings", []),
            "emotional_register":   data.get("emotional_register", {}),
            "search_expansion_terms": expansion_terms,
            "tracks":               tracks[:10],
        }
        _cache_set(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /analyze/lyrics: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")


