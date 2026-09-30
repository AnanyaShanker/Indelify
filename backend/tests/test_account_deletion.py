import main


class FakeQuery:
    def __init__(self, log, table):
        self.log, self.table = log, table
        self.filters = []
    def delete(self):
        return self
    def eq(self, col, val):
        self.filters.append((col, val))
        return self
    def execute(self):
        self.log.append(("delete", self.table, tuple(self.filters)))


class FakeAdmin:
    def __init__(self, log, fail=False):
        self.log, self.fail = log, fail
    def delete_user(self, uid):
        if self.fail:
            raise RuntimeError("boom")
        self.log.append(("delete_user", uid))


class FakeSupabase:
    def __init__(self, fail=False):
        self.log = []
        self.auth = type("Auth", (), {})()
        self.auth.admin = FakeAdmin(self.log, fail)
    def table(self, name):
        return FakeQuery(self.log, name)


def _as_user(uid):
    main.app.dependency_overrides[main.get_current_user] = lambda: main._AuthUser({"id": uid})


def test_delete_account_requires_auth(client, monkeypatch):
    monkeypatch.setattr(main, "supabase_admin", FakeSupabase())
    assert client.delete("/user/account").status_code == 401


def test_delete_account_removes_data_and_user(client, monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr(main, "supabase_admin", fake)
    _as_user("user-1")
    try:
        res = client.delete("/user/account")
    finally:
        main.app.dependency_overrides.clear()
    assert res.status_code == 200
    assert fake.log == [
        ("delete", "searches", (("user_id", "user-1"),)),
        ("delete", "saved_playlists", (("user_id", "user-1"),)),
        ("delete_user", "user-1"),
    ]


def test_delete_account_failure_returns_500(client, monkeypatch):
    monkeypatch.setattr(main, "supabase_admin", FakeSupabase(fail=True))
    _as_user("user-1")
    try:
        res = client.delete("/user/account")
    finally:
        main.app.dependency_overrides.clear()
    assert res.status_code == 500
