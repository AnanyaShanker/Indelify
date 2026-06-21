# Indelify — Security Architecture

## Authentication model

```
Browser → FastAPI (Railway) → Supabase (service role)
              ↑
         validates JWT
         via /auth/v1/user
```

The frontend uses Supabase **only for OAuth auth flows** (`supabase.auth.*`). It never queries database tables directly. All user data (playlists, search history) goes through the FastAPI backend.

The FastAPI backend:
1. Receives the user's Supabase JWT in the `Authorization: Bearer` header
2. Validates it via `GET {SUPABASE_URL}/auth/v1/user` — gets back the real `user.id`
3. Queries Supabase using the **service role key** (which bypasses RLS)
4. **Manually enforces user isolation** by always filtering `.eq("user_id", str(user.id))`

## Supabase tables with user data

| Table | RLS enabled | Policy | Target role |
|---|---|---|---|
| `saved_playlists` | ✅ Yes | `auth.uid() = user_id` for ALL operations | `authenticated` |
| `searches` | ⚠️ Verify | `auth.uid() = user_id` for ALL operations | `authenticated` |

### Why RLS matters even though the backend bypasses it

The backend uses the service role key (bypasses RLS) but enforces isolation itself.
RLS is still important as a **second layer** because:
- The Supabase anon key is visible in frontend source code (by design — it's a public key)
- Without RLS, anyone could call the Supabase REST API directly with the anon key and read all users' data
- With RLS on `authenticated` role, even a valid logged-in user can only see their own rows

### Applying RLS to a new user table

1. Enable RLS on the table (Table Editor → RLS toggle)
2. Add a policy:
   - Name: `Users manage own rows`
   - Target roles: `authenticated` (not `public`)
   - Expression: `(auth.uid() = user_id)`
   - Commands: ALL (SELECT, INSERT, UPDATE, DELETE)
3. Add `.eq("user_id", str(user.id))` to every backend query on that table

## Backend security controls

| Control | Implementation |
|---|---|
| Rate limiting | slowapi — 5 req/min on image upload, 20 req/min on text endpoints |
| Image size limit | 10 MB per file, rejected before PIL opens the file |
| Image type validation | MIME type checked against allowlist before processing |
| PIL decompression bombs | `Image.MAX_IMAGE_PIXELS = 50_000_000` (~50 MP cap) |
| Max files per request | 6 images per request |
| CORS | Exact origin allowlist + regex for Vercel preview URLs only |
| SQL injection | Supabase Python client (parameterized) — no raw SQL anywhere |
| Secrets | All API keys in Railway/Vercel environment variables, never in code |

## Supabase redirect URL allowlist (OAuth)

Only these URLs are permitted as OAuth redirect targets:

- `https://indelify.vercel.app/auth/callback` (production)
- `http://127.0.0.1:5173/auth/callback` (local dev)

Adding new environments: add `{origin}/auth/callback` to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
