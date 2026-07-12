import json

import main


def _fake_mood_json(**overrides) -> str:
    data = {
        "mood_label": "Reflective",
        "current_state": "thinking it over",
        "desired_state": "settled",
        "emotional_intensity": 5,
        "emotional_valence": "Mixed",
        "emotional_arousal": "Calm",
        "situational_context": [],
        "imagery": [],
        "psychological_intent": [],
        "music_characteristics": {},
        "mood_tags": [],
        "situation_tags": [],
        "vibe_tags": [],
        "spotify_query": "reflective calm",
        "search_expansion_terms": [],
        "tracks": [],
    }
    data.update(overrides)
    return json.dumps(data)


def test_analyze_text_happy_path(client, monkeypatch):
    monkeypatch.setattr(main, "groq_text", lambda prompt: _fake_mood_json())
    monkeypatch.setattr(main, "fetch_mood_tracks", lambda **kwargs: [{"title": "Song A", "artist": "Artist A"}])

    r = client.post("/analyze/text", json={"text": "feeling reflective today", "language_preference": "all"})
    assert r.status_code == 200
    body = r.json()
    assert body["mood_label"] == "Reflective"
    assert body["tracks"] == [{"title": "Song A", "artist": "Artist A"}]


def test_analyze_text_serves_repeat_requests_from_cache(client, monkeypatch):
    calls = {"n": 0}

    def fake_groq_text(prompt):
        calls["n"] += 1
        return _fake_mood_json()

    monkeypatch.setattr(main, "groq_text", fake_groq_text)
    monkeypatch.setattr(main, "fetch_mood_tracks", lambda **kwargs: [])

    payload = {"text": "feeling reflective today", "language_preference": "all"}
    r1 = client.post("/analyze/text", json=payload)
    r2 = client.post("/analyze/text", json=payload)

    assert r1.status_code == r2.status_code == 200
    assert calls["n"] == 1, "second identical request should be served from cache, not call the LLM again"


def test_analyze_text_refresh_bypasses_cache(client, monkeypatch):
    calls = {"n": 0}

    def fake_groq_text(prompt):
        calls["n"] += 1
        return _fake_mood_json()

    monkeypatch.setattr(main, "groq_text", fake_groq_text)
    monkeypatch.setattr(main, "fetch_mood_tracks", lambda **kwargs: [])

    base_payload = {"text": "feeling reflective today", "language_preference": "all"}
    client.post("/analyze/text", json=base_payload)
    client.post("/analyze/text", json={**base_payload, "refresh": True})

    assert calls["n"] == 2


def test_analyze_text_rejects_empty_text(client):
    r = client.post("/analyze/text", json={"text": "", "language_preference": "all"})
    assert r.status_code == 422


def test_analyze_text_surfaces_500_when_llm_call_fails(client, monkeypatch):
    def fake_groq_text(prompt):
        raise RuntimeError("groq is down")

    monkeypatch.setattr(main, "groq_text", fake_groq_text)

    r = client.post("/analyze/text", json={"text": "feeling reflective today", "language_preference": "all"})
    assert r.status_code == 500
    assert r.json()["detail"] == "Something went wrong. Please try again."
