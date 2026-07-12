import main


def test_get_current_user_no_header():
    assert main.get_current_user(None) is None


def test_get_current_user_malformed_header():
    assert main.get_current_user("Token abc123") is None


def test_get_current_user_missing_supabase_config(monkeypatch):
    monkeypatch.setattr(main, "_supa_url", None)
    monkeypatch.setattr(main, "_supa_key", None)
    assert main.get_current_user("Bearer sometoken") is None


def test_get_current_user_valid_token(monkeypatch):
    monkeypatch.setattr(main, "_supa_url", "https://fake.supabase.co")
    monkeypatch.setattr(main, "_supa_key", "fake-service-key")

    class FakeResp:
        status_code = 200
        def json(self):
            return {"id": "user-1", "email": "a@b.com", "user_metadata": {"name": "A"}}

    monkeypatch.setattr(main.requests, "get", lambda *a, **k: FakeResp())

    user = main.get_current_user("Bearer sometoken")
    assert user is not None
    assert user.id == "user-1"
    assert user.email == "a@b.com"


def test_get_current_user_rejected_by_supabase(monkeypatch):
    monkeypatch.setattr(main, "_supa_url", "https://fake.supabase.co")
    monkeypatch.setattr(main, "_supa_key", "fake-service-key")

    class FakeResp:
        status_code = 401
        text = "unauthorized"

    monkeypatch.setattr(main.requests, "get", lambda *a, **k: FakeResp())

    assert main.get_current_user("Bearer badtoken") is None


def test_get_current_user_network_error_returns_none(monkeypatch):
    monkeypatch.setattr(main, "_supa_url", "https://fake.supabase.co")
    monkeypatch.setattr(main, "_supa_key", "fake-service-key")

    def raise_error(*a, **k):
        raise ConnectionError("boom")

    monkeypatch.setattr(main.requests, "get", raise_error)

    assert main.get_current_user("Bearer sometoken") is None
