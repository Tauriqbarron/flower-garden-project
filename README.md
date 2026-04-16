# Flower Garden Project

A web app for planning, tracking, and growing cut flowers in Auckland, New Zealand.

**Live site: [auckland.garden](https://auckland.garden)**

## Features

- **Dashboard** — See what to sow, transplant, and harvest right now based on the current month
- **Flower Database** — 30 cut flower varieties with Auckland-specific growing data
- **Growing Calendar** — 12-month calendar with sowing and harvest windows
- **Flower Detail** — Vase life, growing conditions, care notes, and best varieties
- **Vegetable Companion Planting** — Vegetable data alongside flowers

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS v4, TypeScript |
| Backend | Python, FastAPI |
| Database | JSON flat-file |
| Deployment | Docker, Nginx, self-hosted |

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Location Data

All timing is optimised for **Auckland, New Zealand** (USDA Zone 10a, Southern Hemisphere). Sowing windows, harvest periods, and care notes reflect local climate conditions.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved. All PRs are reviewed and merged by the maintainer.

## License

MIT — see [LICENSE](LICENSE)
