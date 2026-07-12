import io
import json

from PIL import Image

import main


def _tiny_jpeg_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buf, format="JPEG")
    return buf.getvalue()


def test_analyze_image_rejects_more_than_five_files(client):
    img = _tiny_jpeg_bytes()
    files = [("files", (f"p{i}.jpg", img, "image/jpeg")) for i in range(6)]
    r = client.post("/analyze/image", files=files, data={"language_preference": "all"})
    assert r.status_code == 400
    assert "Maximum 5 images" in r.json()["detail"]


def test_analyze_image_rejects_unsupported_mime(client):
    files = [("files", ("note.txt", b"not an image", "text/plain"))]
    r = client.post("/analyze/image", files=files, data={"language_preference": "all"})
    assert r.status_code == 400
    assert "Unsupported file type" in r.json()["detail"]


def test_analyze_image_rejects_oversized_file(client):
    big = b"0" * (main._MAX_IMG_BYTES + 1)
    files = [("files", ("big.jpg", big, "image/jpeg"))]
    r = client.post("/analyze/image", files=files, data={"language_preference": "all"})
    assert r.status_code == 413


def test_analyze_image_happy_path(client, monkeypatch):
    img = _tiny_jpeg_bytes()

    def fake_vision(prompt, images):
        assert len(images) == 1
        return json.dumps({
            "visual_scene": "a quiet room",
            "atmosphere": "calm",
            "emotional_states": ["calm"],
            "story": "a quiet afternoon",
            "emotional_amplification": "makes it feel slower",
            "mood_label": "Quiet Calm",
            "emotional_intensity": 4,
            "emotional_valence": "Positive",
            "imagery_tags": ["quiet", "still"],
            "spotify_query": "calm ambient",
            "search_expansion_terms": [],
            "tracks": [],
        })

    def fake_fetch(**kwargs):
        return [{
            "title": "Test Song", "artist": "Test Artist", "album": "Test Album",
            "spotify_url": "https://open.spotify.com/track/x", "album_art": None,
            "uri": "spotify:track:x", "preview_url": None, "reason": "fits the mood",
        }]

    monkeypatch.setattr(main, "groq_vision_multi", fake_vision)
    monkeypatch.setattr(main, "fetch_mood_tracks", fake_fetch)

    files = [("files", ("p1.jpg", img, "image/jpeg"))]
    r = client.post("/analyze/image", files=files, data={"language_preference": "all"})
    assert r.status_code == 200
    body = r.json()
    assert body["mood_label"] == "Quiet Calm"
    assert body["tracks"][0]["title"] == "Test Song"


def test_analyze_image_surfaces_500_when_llm_call_fails(client, monkeypatch):
    def fake_vision(prompt, images):
        raise RuntimeError("groq is down")

    monkeypatch.setattr(main, "groq_vision_multi", fake_vision)

    img = _tiny_jpeg_bytes()
    files = [("files", ("p1.jpg", img, "image/jpeg"))]
    r = client.post("/analyze/image", files=files, data={"language_preference": "all"})
    assert r.status_code == 500
    assert r.json()["detail"] == "Something went wrong. Please try again."
