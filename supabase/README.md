# Cyber Shield — Backend (Supabase)

This folder holds the backend scaffolding for Cyber Shield. Nothing here is
provisioned automatically — you push it to **your own** Supabase project from
VS Code using the Supabase CLI, so you stay in control of all keys.

```
supabase/
├─ migrations/
│  └─ 0001_init.sql            # tables + RLS + trigger + private storage bucket
├─ functions/
│  ├─ _shared/cors.ts          # shared CORS headers
│  └─ analyze-email/
│     ├─ index.ts              # analysis orchestration (Deno)
│     └─ providers.ts          # provider adapters (env-var keys only)
├─ .env.example                # provider secret placeholders (server-side only)
└─ README.md                   # this file
```

## What gets created

**Tables** (all with Row Level Security so users only see their own rows):

| Table             | Purpose                                             |
|-------------------|-----------------------------------------------------|
| `profiles`        | one row per user, auto-created on sign-up            |
| `scans`           | one row per uploaded `.eml` / analysis run           |
| `scan_reports`    | the full forensic report JSON for a scan             |
| `scan_indicators` | individual evidence rows for a scan                  |

**Storage:** a **private** bucket `eml-files` (10 MB limit). Files live under a
per-user folder `eml-files/<user_id>/…` and storage policies ensure a user can
only access files in their own folder.

**Trigger:** `on_auth_user_created` inserts a `profiles` row whenever a new
auth user signs up.

## One-time setup (from VS Code terminal)

1. **Install the CLI** (if needed):
   ```bash
   npm install -g supabase
   ```
2. **Log in and link** to your project:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
3. **Apply the database migration** (creates tables, RLS, bucket, trigger):
   ```bash
   supabase db push
   ```
4. **Set the provider secrets** (see `.env.example`). Either individually:
   ```bash
   supabase secrets set VIRUSTOTAL_API_KEY=xxxx
   supabase secrets set ABUSEIPDB_API_KEY=xxxx
   # ...etc
   ```
   or from a file (`cp .env.example .env`, fill it in, then):
   ```bash
   supabase secrets set --env-file supabase/.env
   ```
5. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy analyze-email
   ```

## Wire the frontend to the backend

In the project root, copy `.env.example` to `.env` and fill in the **public**
values (safe for the browser):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_BASE_URL=https://<your-project-ref>.supabase.co/functions/v1
```

Then restart `npm run dev`. The frontend switches from mock mode to real
Supabase auth + real analysis automatically.

> The function endpoint path is `analyze-email`. If you keep the REST-style
> paths in `src/lib/config.ts`, point `VITE_API_BASE_URL` at your gateway, or
> adjust `src/lib/api.ts` to call `${VITE_API_BASE_URL}/analyze-email`.

## Security guarantees baked in

- **No secrets in the browser or in this repo.** Provider keys live only in
  Supabase Edge Function secrets.
- **No false "safe".** A missing key => provider status `not_configured`.
- **No dangerous actions.** The function reads the `.eml` as text only; it never
  executes attachments or visits URLs.
- **No sensitive logging.** Secrets, raw email bodies, and PII are never logged.
- **Owner-only data.** RLS is enabled on every user-data table and the storage
  bucket is private with per-user folder policies.
