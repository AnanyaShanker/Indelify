from datetime import timedelta

import main


def test_cache_set_and_get_roundtrip():
    main._cache_set("k1", {"a": 1})
    assert main._cache_get("k1") == {"a": 1}


def test_cache_get_missing_key_returns_none():
    assert main._cache_get("nope") is None


def test_cache_entry_expires_after_ttl(monkeypatch):
    monkeypatch.setattr(main, "CACHE_TTL", timedelta(seconds=-1))
    main._cache_set("k2", "value")
    assert main._cache_get("k2") is None
    assert "k2" not in main._cache


def test_cache_evicts_oldest_when_full(monkeypatch):
    monkeypatch.setattr(main, "MAX_CACHE_SIZE", 3)
    main._cache_set("a", 1)
    main._cache_set("b", 2)
    main._cache_set("c", 3)
    main._cache_set("d", 4)
    assert len(main._cache) == 3
    assert "a" not in main._cache
    assert main._cache_get("d") == 4


def test_cache_key_is_stable_for_same_inputs():
    assert main._cache_key("text_v2", "hello", "all") == main._cache_key("text_v2", "hello", "all")


def test_cache_key_differs_for_different_inputs():
    assert main._cache_key("text_v2", "hello", "all") != main._cache_key("text_v2", "goodbye", "all")
