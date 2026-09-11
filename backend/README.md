# Cyber Shield — Backend (FastAPI)

A from-scratch Python API that powers Cyber Shield: user auth (JWT), a database
(SQLite by default), safe `.eml` analysis, live threat-provider lookups, and a
PDF report export. It implements exactly the endpoints the React frontend calls.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | – | Create an account |
| POST | `/api/auth/login` | – | Log in, returns a JWT + user |
| GET | `/api/auth/me` | Bearer | Current user (session restore) |
| POST | `/api/scans` | Bearer | Upload a `.eml`, run analysis |
| GET | `/api/scans` | Bearer | List the user's scans |
| GET | `/api/scans/{id}` | Bearer | One scan + full report |
| DELETE | `/api/scans/{id}` | Bearer | Delete a scan |
| GET | `/api/scans/{id}/report.pdf?token=…` | token | Download the PDF report |
| GET | `/api/health` | – | Status + which provider keys are set |

Interactive docs (Swagger) run at `http://localhost:8000/docs`.

## Run it

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                  # then paste your keys into .env
uvicorn app.main:app --reload --port 8000
```

The frontend talks to it when the project-root `.env` has:

```
VITE_API_BASE_URL=http://localhost:8000
```

## API keys

Put provider keys in `backend/.env` (git-ignored — never committed). Any key you
leave blank makes that provider report `not_configured`; it is simply excluded
from the score and **never** counted as "safe".

| Variable | Notes |
|----------|-------|
| `VIRUSTOTAL_API_KEY` | Domain reputation for URLs in the email |
| `GOOGLE_WEBRISK_API_KEY` | Requires billing enabled on the GCP project |
| `ABUSEIPDB_API_KEY` | Sending-IP abuse reputation |
| `MXTOOLBOX_API_KEY` | Sender-domain blacklist check |
| `MAXMIND_LICENSE_KEY` | IP geolocation — **also needs `MAXMIND_ACCOUNT_ID`** |

`JWT_SECRET` is required to sign login tokens (generate one with
`python3 -c "import secrets; print(secrets.token_hex(32))"`).

## Architecture

```
backend/app/
├─ main.py          FastAPI app, CORS, routers, health
├─ config.py        env-driven settings (keys, JWT, CORS, DB)
├─ database.py      SQLAlchemy engine/session (SQLite)
├─ models.py        users, scans, scan_reports, scan_indicators
├─ schemas.py       Pydantic request/response models
├─ security.py      PBKDF2 password hashing + JWT
├─ analyzer.py      safe, text-only .eml parsing + patterns
├─ providers.py     VirusTotal / Web Risk / AbuseIPDB / MaxMind / MXToolbox
├─ pdf.py           PDF report generation (fpdf2)
└─ routers/
   ├─ auth.py       register / login / me
   └─ scans.py      create / list / get / delete / report.pdf
```

## Security notes

- No key is hardcoded; all secrets come from `.env` (git-ignored).
- Missing provider key ⇒ `not_configured` (never a false "safe").
- `.eml` files are read as **text only** — links are never opened, attachments
  never executed.
- Passwords are stored as salted PBKDF2 hashes; sessions use signed JWTs.
- Every scan is owner-scoped: users only ever see their own scans.
- Secrets, raw email bodies, and PII are never logged.

## Moving to production

- Swap SQLite for Postgres by changing `DATABASE_URL`.
- Replace `Base.metadata.create_all` with Alembic migrations.
- Restrict `FRONTEND_ORIGINS` to your real domain.
- Serve behind HTTPS and set a strong `JWT_SECRET`.
```
