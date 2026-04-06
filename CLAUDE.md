# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Conta Comigo** — personal web app to manage credit card expenses. Import CSV statements, auto-categorize transactions, and visualize spending.

## Monorepo structure

```
conta-comigo/
├── frontend/   # Vite + React + TypeScript + Tailwind + shadcn/ui
└── backend/    # FastAPI + Python 3.12 + Supabase
```

## Backend

**Python 3.12 required** (pydantic-core has no pre-built wheel for 3.14+).

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Run dev server
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  .venv/bin/uvicorn app.main:app --reload

# Run all tests
.venv/bin/pytest

# Run a single test
.venv/bin/pytest tests/test_csv_parser.py::test_parse_standard_rows
```

Copy `backend/.env.example` → `backend/.env` and fill in values before running.

**Key modules:**
- `app/core/config.py` — settings loaded from `.env` via `pydantic-settings` (includes `CORS_ORIGINS`, `ENVIRONMENT`)
- `app/core/auth.py` — FastAPI dependency that validates Supabase JWT tokens
- `app/services/categorization.py` — two-tier categorization (memory → rules); batch helpers for import preview
- `app/services/csv_parser.py` — CSV parsing with encoding/separator fallback
- `app/api/routes/` — `imports.py`, `transactions.py`, `categories.py`

**Auth:** every route uses `Depends(get_current_user)` which validates the Supabase Bearer token. The backend uses the **service role key** (not the anon key) to bypass RLS when reading/writing on behalf of the authenticated user.

## Frontend

```bash
cd frontend
npm install
npm run dev       # starts on http://localhost:5173
npm run build
npm run lint
```

Copy `frontend/.env.example` → `frontend/.env.local` and fill in values.

**Key files:**
- `src/lib/supabase.ts` — Supabase client (uses anon key + user session)
- `src/lib/utils.ts` — `cn()` helper for Tailwind class merging
- `src/hooks/useAuth.ts` — session state from Supabase Auth
- `src/services/api.ts` — fetch calls to the FastAPI backend, attaches Bearer token
- `src/types/index.ts` — shared TypeScript types

Path alias `@/` maps to `src/`.

## Categorization engine

Located in `backend/app/services/categorization.py`. Priority order:

1. **Memory** — looks up `category_memory` by normalized merchant key (digits stripped); exact key match
2. **Rules** — scans `category_rules` for keyword substring matches on description and bank category

Import preview loads rules once and batches memory lookups by all keys in the file. Manual category edits (via `PATCH /transactions/:id/category`) also update `category_memory`, so the system learns over time.

## Database (Supabase)

| Table | Key columns |
|---|---|
| `transactions` | `date`, `description`, `amount`, `category_id`, `user_id` |
| `categories` | `name`, `color`, `icon` |
| `category_rules` | `keyword`, `category_id` |
| `category_memory` | `merchant_key`, `category_id` |

## Environment variables

| Variable | Where |
|---|---|
| `SUPABASE_URL` | backend |
| `SUPABASE_SERVICE_ROLE_KEY` | backend |
| `ENVIRONMENT` | backend (`production` disables OpenAPI `/docs` and `/openapi.json`) |
| `CORS_ORIGINS` | backend (comma-separated origins; optional, has dev defaults) |
| `VITE_SUPABASE_URL` | frontend |
| `VITE_SUPABASE_ANON_KEY` | frontend |
| `VITE_API_URL` | frontend (default: `http://localhost:8000`) |
