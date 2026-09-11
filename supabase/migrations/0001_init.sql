-- ============================================================================
-- Cyber Shield — initial schema
-- ----------------------------------------------------------------------------
-- Tables: profiles, scans, scan_reports, scan_indicators
-- Security: Row Level Security (RLS) on EVERY user-data table so a user can
--           only ever read/write their own rows.
-- Also: a private storage bucket for uploaded .eml files, with per-user access,
--       and a trigger that auto-creates a profile row on sign-up.
--
-- Apply with the Supabase CLI from VS Code:
--   supabase link --project-ref <your-project-ref>
--   supabase db push
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1) profiles — one row per user, created automatically on sign-up.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  email      text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2) scans — one row per uploaded .eml / analysis run.
-- ----------------------------------------------------------------------------
create table if not exists public.scans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  original_filename text not null,
  file_path         text,                    -- path within the private storage bucket
  file_hash         text,                    -- sha256 of the uploaded file
  status            text not null default 'queued'
                      check (status in ('queued','analyzing','completed','failed')),
  overall_score     int  check (overall_score between 0 and 100),
  risk_category     text check (risk_category in ('Low Risk','Suspicious','High Risk','Critical')),
  sender_domain     text,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

-- ----------------------------------------------------------------------------
-- 3) scan_reports — the full forensic report JSON for a scan (1:1 with scans).
-- ----------------------------------------------------------------------------
create table if not exists public.scan_reports (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references public.scans (id) on delete cascade,
  report_json jsonb not null,
  pdf_path    text,                          -- path to generated PDF in storage
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4) scan_indicators — individual evidence rows for a scan (many per scan).
-- ----------------------------------------------------------------------------
create table if not exists public.scan_indicators (
  id         uuid primary key default gen_random_uuid(),
  scan_id    uuid not null references public.scans (id) on delete cascade,
  type       text not null,                  -- url | ip | header | pattern | ...
  value      text,
  severity   text not null default 'info'
               check (severity in ('info','low','medium','high','critical')),
  source     text,                           -- provider / engine that found it
  finding    text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes for common lookups.
-- ----------------------------------------------------------------------------
create index if not exists idx_scans_user_created
  on public.scans (user_id, created_at desc);
create index if not exists idx_scans_risk
  on public.scans (risk_category);
create index if not exists idx_reports_scan
  on public.scan_reports (scan_id);
create index if not exists idx_indicators_scan
  on public.scan_indicators (scan_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.scans           enable row level security;
alter table public.scan_reports    enable row level security;
alter table public.scan_indicators enable row level security;

-- ---- profiles: a user sees/edits only their own profile ----
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---- scans: full ownership by user_id ----
create policy "scans_select_own" on public.scans
  for select using (auth.uid() = user_id);
create policy "scans_insert_own" on public.scans
  for insert with check (auth.uid() = user_id);
create policy "scans_update_own" on public.scans
  for update using (auth.uid() = user_id);
create policy "scans_delete_own" on public.scans
  for delete using (auth.uid() = user_id);

-- ---- scan_reports: access allowed only if the parent scan belongs to the user ----
create policy "reports_select_own" on public.scan_reports
  for select using (
    exists (select 1 from public.scans s
            where s.id = scan_reports.scan_id and s.user_id = auth.uid())
  );
create policy "reports_insert_own" on public.scan_reports
  for insert with check (
    exists (select 1 from public.scans s
            where s.id = scan_reports.scan_id and s.user_id = auth.uid())
  );
create policy "reports_delete_own" on public.scan_reports
  for delete using (
    exists (select 1 from public.scans s
            where s.id = scan_reports.scan_id and s.user_id = auth.uid())
  );

-- ---- scan_indicators: same parent-ownership rule ----
create policy "indicators_select_own" on public.scan_indicators
  for select using (
    exists (select 1 from public.scans s
            where s.id = scan_indicators.scan_id and s.user_id = auth.uid())
  );
create policy "indicators_insert_own" on public.scan_indicators
  for insert with check (
    exists (select 1 from public.scans s
            where s.id = scan_indicators.scan_id and s.user_id = auth.uid())
  );
create policy "indicators_delete_own" on public.scan_indicators
  for delete using (
    exists (select 1 from public.scans s
            where s.id = scan_indicators.scan_id and s.user_id = auth.uid())
  );

-- ============================================================================
-- Auto-create a profile when a new auth user signs up.
-- SECURITY DEFINER so it can insert into public.profiles from the auth schema.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Private storage bucket for uploaded .eml files.
-- Files live under a per-user folder: eml-files/<user_id>/<filename>
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eml-files',
  'eml-files',
  false,                                   -- PRIVATE bucket
  10485760,                                -- 10 MB limit
  array['message/rfc822','text/plain','application/octet-stream']
)
on conflict (id) do nothing;

-- Storage RLS: a user may only touch files inside their own folder.
-- (storage.foldername(name))[1] is the first path segment = the user id.
create policy "eml_read_own" on storage.objects
  for select using (
    bucket_id = 'eml-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "eml_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'eml-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "eml_delete_own" on storage.objects
  for delete using (
    bucket_id = 'eml-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
