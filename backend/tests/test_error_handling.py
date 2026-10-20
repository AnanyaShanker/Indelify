import main


def test_unhandled_error_returns_json_with_cors_headers(client, monkeypatch):
    class BrokenSupabase:
        def table(self, name):
            raise RuntimeError("supabase down")

    monkeypatch.setattr(main, "supabase_admin", BrokenSupabase())
    main.app.dependency_overrides[main.get_current_user] = lambda: main._AuthUser({"id": "user-1"})
    try:
        resp = client.get("/user/searches", headers={"Origin": "http://localhost:5173"})
    finally:
        main.app.dependency_overrides.clear()

    assert resp.status_code == 500
    assert resp.json() == {"detail": "Something went wrong. Please try again."}
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
