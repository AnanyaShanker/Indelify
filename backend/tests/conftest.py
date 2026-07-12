import os
import sys

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("SPOTIFY_CLIENT_ID", "test-spotify-id")
os.environ.setdefault("SPOTIFY_CLIENT_SECRET", "test-spotify-secret")
os.environ.setdefault("GENIUS_API_KEY", "test-genius-key")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture(autouse=True)
def _reset_shared_state():
    """Each test gets a clean cache and a clean rate-limit counter, since both
    live in module-level state shared across the whole test session."""
    main._cache.clear()
    main.limiter.reset()
    yield


@pytest.fixture
def client():
    return TestClient(main.app)
