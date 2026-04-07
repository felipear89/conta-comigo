# Conta Comigo

Personal web app to manage credit card expenses. Import CSV statements, auto-categorize transactions, track fixed costs, and forecast future installment payments.

## Features

- **Import credit card statements** — upload CSV files, preview and review categorization before confirming
- **Auto-categorization** — keyword rules automatically assign categories to transactions
- **Bill month** — transactions are assigned to a billing month, not just the purchase date
- **Installment forecast** — projects future installment payments by month
- **Fixed costs** — track recurring expenses (internet, rent, utilities) with per-month overrides
- **Dashboard** — monthly overview with spending by category, fixed costs, and upcoming installments

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| Backend | FastAPI, Python 3.12, Pydantic v2 |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth |

## Project structure

```
conta-comigo/
├── frontend/          # Vite + React app
├── backend/           # FastAPI app
└── supabase/
    └── migrations/    # SQL migration files
```

## Setup

### Prerequisites

- Node.js 20+
- Python 3.12 (required — pydantic-core has no pre-built wheel for 3.13+)
- A [Supabase](https://supabase.com) project

### 1. Database

Run the migration files in order against your Supabase project (SQL Editor or Supabase CLI):

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_fixed_costs.sql
supabase/migrations/003_user_category_rules.sql
supabase/migrations/004_bill_month.sql
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

.venv/bin/uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local

npm run dev
# Runs on http://localhost:5173
```

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `CORS_ORIGINS` | Comma-separated allowed origins (default: localhost) |
| `ENVIRONMENT` | Set to `production` to disable `/docs` and `/openapi.json` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL (default: `http://localhost:8000`) |

## Docker

```bash
# Copy and fill in all variables
cp backend/.env.example .env

# Build and start both services
docker compose up --build
# Frontend → http://localhost
# Backend  → http://localhost:8000
```

The `.env` file at the repo root is used by docker-compose. It needs all backend variables plus the frontend build args:

```env
# Backend (runtime)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGINS=http://localhost
BACKEND_PORT=8000
FRONTEND_PORT=80

# Frontend (baked into the bundle at build time)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

> **Note:** Because Vite bakes `VITE_*` variables into the bundle at build time, you must rebuild the frontend image (`docker compose build frontend`) whenever these values change.

---

## Running tests

```bash
cd backend
.venv/bin/pytest
```

## CSV format

The importer expects a CSV with at least these columns (semicolon or comma separated):

| Column | Description |
|---|---|
| `date` | Transaction date (DD/MM/YYYY or YYYY-MM-DD) |
| `description` | Merchant or transaction description |
| `amount` | Amount (positive number) |
| `installment` | Optional — installment info, e.g. `7/12` |
| `bank_category` | Optional — raw category from the bank |
