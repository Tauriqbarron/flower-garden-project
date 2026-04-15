# Flower Garden Project

A web app for planning, tracking, and growing cut flowers in Auckland, New Zealand.

## Tech Stack

- **Backend**: Python + FastAPI + JSON database
- **Frontend**: Next.js 15 + React + Tailwind CSS v4

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Features

- **Dashboard** - See what to sow, transplant, and harvest right now
- **Flower Database** - 30 cut flower varieties with Auckland-specific data
- **Growing Calendar** - 12-month Auckland calendar with sowing/harvest windows
- **Flower Detail** - Vase life, growing conditions, care notes, best varieties

## Location Data

All timing data is optimised for Auckland, New Zealand (USDA Zone 10a, Southern Hemisphere).
