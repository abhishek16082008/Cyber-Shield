# Cyber Shield — Email Protection

**AurixCyber Airlines · defensive email-forensics platform**

Logged-in users upload a suspicious `.eml` file and receive an AI-assisted
forensic threat report — a 0–100 threat score, provider signal breakdown,
SPF/DKIM/DMARC status, IP reputation, URL/domain findings, suspicious-pattern
detection, an evidence table, and recommended safe actions.

> **Defensive by design.** Cyber Shield never executes attachments and never
> visits suspicious URLs. It inspects the email as **text only**.

Built with **React + Vite + TypeScript + Tailwind** (shadcn-style UI
components), with an optional **Supabase** backend (auth, database, private
storage, Edge Functions). It runs **fully offline in mock mode** with no backend
at all — add a `.env` to connect real Supabase.

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. On first run the app is in **mock mode**:

- Sign up / log in with any email + password (stored locally, no server).
- Upload a `.eml`, watch the animated investigation, read the report.
- Scan history persists in `localStorage`; sample scans are pre-seeded.

Build for production:

```bash
npm run build   # type-checks, then bundles to dist/
npm run preview # serve the production build locally
```

---

## The seven screens

| Route             | Screen         | Notes                                                            |
|-------------------|----------------|-----------------------------------------------------------------|
| `/auth`           | Login / Sign-up| Tabs, forgot-password, email-verification placeholder, validation |
| `/`               | Home           | Product explainer, icon "how it works", CTA, floating brand mark |
| `/analyse`        | Analyse        | Drag-drop `.eml` upload, validation, instruction panel          |
| `/investigation`  | Investigation  | Animated 10-stage pipeline with status chips + scan lines        |
| `/reports`        | Reports        | Threat gauge, provider chart, auth, IP, URLs, patterns, evidence |
| `/dashboard`      | Dashboard      | Scan history with search + date/risk filters + actions           |
| `/about`          | About          | Mission, privacy promise, "how we protect data", contact         |

Analyse / Investigation / Reports / Dashboard require login.

---

## Design system

A **"digital-forensics instrument panel"** aesthetic — deliberately *not* the
common blue-glassmorphism look:

- Near-black, neutral **steel** surfaces (solid, no blur/glass).
- Hairline borders, corner-bracket (reticle) framing, monospace `//` labels.
- **Blue** = secure / trusted / analysis signals. **Red** = threat / critical.
  **Amber** = suspicious. Used as *functional* signal colors, not decoration.
- Every reusable color and spacing value is a **CSS variable** in
  [`src/index.css`](src/index.css) — change once, updates everywhere.
- Responsive (desktop / tablet / mobile), keyboard-friendly, accessible
  contrast, honors `prefers-reduced-motion`.

All charts/graphics are dependency-free: the threat gauge is **inline SVG**, the
provider chart is drawn on **`<canvas>`**, and the shield/wing/email logo is
pure SVG with a CSS scan animation.

---

## Project structure

```
cyber-shield/
├─ index.html
├─ src/
│  ├─ main.tsx / App.tsx           # entry + routing
│  ├─ index.css                    # design tokens (CSS variables) + theme
│  ├─ components/
│  │  ├─ ui/                       # shadcn-style primitives (button, card, …)
│  │  ├─ layout/                   # Sidebar, TopBar, AppLayout, nav model
│  │  ├─ ShieldLogo / ThreatGauge / ProviderBarChart / Splash / ProtectedRoute
│  ├─ pages/                       # the seven screens
│  ├─ context/                     # AuthContext, ScanContext
│  ├─ lib/
│  │  ├─ config.ts                 # ← all backend URLs/keys live here (public only)
│  │  ├─ api.ts                    # data layer (Supabase or mock)
│  │  ├─ supabase.ts               # Supabase client (null in mock mode)
│  │  ├─ analyzer.ts               # safe, text-only .eml analysis (mock mode)
│  │  ├─ pdf.ts                    # print-to-PDF report export
│  │  └─ types.ts
│  └─ data/mockData.ts             # seed history
└─ supabase/                       # backend scaffolding (see supabase/README.md)
   ├─ migrations/0001_init.sql     # tables + RLS + trigger + private bucket
   └─ functions/analyze-email/     # Edge Function (secret placeholders only)
```

---

## Backend

The frontend auto-selects its backend from `.env` — **REST** (custom FastAPI)
if `VITE_API_BASE_URL` is set, **Supabase** if the `VITE_SUPABASE_*` vars are
set, otherwise **mock** mode. No component changes are needed to switch.

### Option A — FastAPI backend (recommended; fully wired)

A complete Python backend lives in [`backend/`](backend/README.md): JWT auth,
SQLite database, safe `.eml` analysis, live provider lookups (VirusTotal,
Google Web Risk, AbuseIPDB, MaxMind, MXToolbox) and PDF export.

Run both servers (two terminals):

```bash
# terminal 1 — backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # paste your provider keys into backend/.env
uvicorn app.main:app --reload --port 8000
```
```bash
# terminal 2 — frontend
npm run dev
```

Project-root `.env` (already set for local dev):

```
VITE_API_BASE_URL=http://localhost:8000
```

Provider-key notes: **Google Web Risk** needs billing enabled on your GCP
project; **MaxMind** needs `MAXMIND_ACCOUNT_ID` in addition to the license key.
Any missing/blocked key just reports `not_configured` / `unavailable` — never a
false "safe". See [`backend/README.md`](backend/README.md).

### Option B — Supabase backend (alternative)

Scaffolding for a Supabase backend is in [`supabase/`](supabase/README.md)
(Postgres + RLS + Edge Function). To use it instead, follow that README and set
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in the root `.env` (leave
`VITE_API_BASE_URL` blank).

---

## Security model

- **No secrets in the frontend or repo.** Only the public Supabase URL + anon
  key ever reach the browser (RLS protects the data). Provider API keys
  (VirusTotal, Google Web Risk, AbuseIPDB, MXToolbox, MaxMind) live **only** in
  Supabase Edge Function secrets.
- **Never a false "safe".** A missing provider key => `not_configured` in the
  report, not a clean result.
- **No dangerous actions.** Emails are parsed as text; links are shown as inert
  text and never opened; attachments are never executed.
- **Owner-only data.** RLS on every table; the `.eml` storage bucket is private
  with per-user folder policies.
- **No sensitive logging** of secrets, raw email bodies, passwords, or PII.

---

## Scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm run dev`     | Start the Vite dev server                |
| `npm run build`   | Type-check + production build to `dist/`  |
| `npm run preview` | Preview the production build             |
