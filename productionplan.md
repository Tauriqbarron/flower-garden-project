# Flower Garden Project — Production Deployment Plan

## Overview

Deploy the Flower Garden Project (Auckland cut flower & vegetable planner) to the ProDesk server (`121.74.1.18`), following the same Docker Compose + Nginx + Cloudflare Tunnel pattern used by ParishHub. **No auth, no database** — the app serves static JSON files through FastAPI, so the stack is much simpler.

---

## Current Stack

| Layer | Tech | Dev Port |
|-------|------|----------|
| Frontend | Next.js 15 + React 19 + Tailwind v4 | 3000 |
| Backend | FastAPI + JSON files (flowers.json, vegetables.json, activities.json) | 8000 |
| Data | Flat JSON in `backend/database/` | — |

**Key difference from ParishHub:** No PostgreSQL, no auth, no Alembic migrations. The backend reads JSON files at startup. This means we need fewer containers and a simpler deploy script.

---

## Architecture (Production)

```
Cloudflare → ProDesk (121.74.1.18:80)
  └─ Nginx (container, port 80)
       ├─ /api/*    → backend:8000 (FastAPI)
       └─ /*        → frontend:3000 (Next.js)
```

### Containers

| Service | Image | Internal Port | Notes |
|---------|-------|---------------|-------|
| `backend` | Custom (python:3.11-slim) | 8000 | FastAPI serving JSON data |
| `frontend` | Custom (node:22-alpine) | 3000 | Next.js production build |
| `nginx` | nginx:1.25-alpine | 80 | Reverse proxy, bound to 127.0.0.1:80 |

No database container — data is baked into the backend image from `backend/database/*.json`.

---

## Steps

### 1. Fix the Git Repo

The repo has a `master` branch with no commits (unborn). Need to:
- Stage all files and make an initial commit
- Push to `origin master` (or rename to `main` and push)

```bash
cd ~/Github/flower-garden-project
git add -A
git commit -m "Initial commit — flower garden project"
git push origin master
```

### 2. Create Dockerfiles

**`backend/Dockerfile`**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app ./app

# Data files are part of the image (no external DB)
COPY ./database ./database

# Non-root user
RUN addgroup --gid 1001 --system appgroup && \
    adduser --uid 1001 --system --ingroup appgroup appuser
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**`frontend/Dockerfile`**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
# Build-time env for API URL (Nginx proxies /api → backend)
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

FROM node:22-alpine
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
USER appuser

CMD ["node", "server.js"]
```

> **Note:** Next.js standalone output mode is required for the Docker build. Need to add `output: "standalone"` to `next.config.ts`.

### 3. Update `next.config.ts` for Production

The current config rewrites `/api/*` to `localhost:8000` — this only works in dev. In production, Nginx handles routing, so the rewrite is not needed. Use environment-based config:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    // In production, Nginx handles /api routing — no rewrite needed
    if (process.env.NODE_ENV === "production") {
      return [];
    }
    // Dev: proxy to local backend
    return [
      { source: "/api/:path*", destination: "http://localhost:8000/api/:path*" },
    ];
  },
};
```

### 4. Update `frontend/src/lib/api.ts`

Currently hardcodes `API_BASE = "http://localhost:8000"`. In production, the frontend should use relative URLs since Nginx proxies `/api` to the backend:

```typescript
const API_BASE = process.env.NODE_ENV === "production" ? "" : "http://localhost:8000";
```

### 5. Create `docker-compose.prod.yml`

```yaml
name: flower-garden

services:
  backend:
    build: ./backend
    restart: unless-stopped
    volumes:
      # Mount database dir so JSON updates don't require image rebuild
      - ./backend/database:/app/database:ro
    networks:
      - flower-network
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    restart: unless-stopped
    environment:
      NODE_ENV: production
    depends_on:
      - backend
    networks:
      - flower-network

  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      - ./nginx/templates:/etc/nginx/templates:ro
    environment:
      - DOMAIN_NAME=garden.tauriqbarron.co.nz
    depends_on:
      - frontend
      - backend
    networks:
      - flower-network

networks:
  flower-network:
    driver: bridge
```

> **Port choice:** ParishHub uses `127.0.0.1:80`. Since both may coexist on the same host, we bind to `8080` and let Cloudflare Tunnel route by hostname. If ParishHub is not on this server (or we're replacing it), change to `127.0.0.1:80`.

### 6. Create Nginx Config

**`nginx/templates/flower.conf.template`**

```nginx
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API → backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health endpoint (for deploy script)
    location /health {
        proxy_pass http://backend:8000/health;
    }

    # Everything else → frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7. Create Deploy Script

**`scripts/deploy.sh`** — Simplified version of ParishHub's (no DB backup/migration steps):

```bash
#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_URL="http://localhost:8080/health"
MAX_RETRIES=20
INTERVAL=3
LOG_DIR="/var/log/flower-deploy"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${LOG_DIR}/deploy-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Deploy started ==="
cd "$DEPLOY_DIR"

PREVIOUS_COMMIT="$(git rev-parse HEAD)"
log "Pulling latest..."
git pull origin master
CURRENT_COMMIT="$(git rev-parse HEAD)"

if [ "$PREVIOUS_COMMIT" = "$CURRENT_COMMIT" ]; then
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log "No changes. Healthy. Done."
        exit 0
    fi
fi

log "Building images..."
docker compose -f "$COMPOSE_FILE" build --no-cache backend frontend

log "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate

log "Health check..."
for i in $(seq 1 "$MAX_RETRIES"); do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log "Healthy (attempt $i). Deploy complete."
        docker image prune -f > /dev/null 2>&1
        exit 0
    fi
    sleep "$INTERVAL"
done

log "ERROR: Health check failed after $MAX_RETRIES attempts"
exit 1
```

### 8. Create `.env` File

```env
DOMAIN_NAME=garden.tauriqbarron.co.nz
```

(Or whatever domain/subdomain you want to use.)

### 9. Update CORS in Backend

For production, tighten CORS. In `backend/app/main.py`, replace `allow_origins=["*"]` with the actual domain:

```python
import os

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

Add to `docker-compose.prod.yml` backend environment:
```yaml
environment:
  CORS_ORIGINS: "https://garden.tauriqbarron.co.nz"
```

### 10. Push to Server & Deploy

```bash
# SSH into ProDesk
ssh deploy@121.74.1.18

# Clone the repo
cd /opt
git clone https://github.com/Tauriqbarron/flower-garden-project.git
cd flower-garden-project

# Set up .env
echo "DOMAIN_NAME=garden.tauriqbarron.co.nz" > .env

# First deploy
docker compose -f docker-compose.prod.yml up -d --build

# Verify
curl http://localhost:8080/health
```

### 11. Configure Cloudflare Tunnel

Add a public hostname route in Cloudflare:
- **Hostname:** `garden.tauriqbarron.co.nz` (or your chosen subdomain)
- **Service:** `http://localhost:8080`

### 12. Set Up Self-Hosted GitHub Actions Runner

If not already running on the ProDesk (ParishHub may have one), install the runner and create a workflow:

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy to ProDesk
on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - name: Pull and deploy
        run: |
          cd /opt/flower-garden-project
          bash scripts/deploy.sh
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/Dockerfile` | Create | Python 3.11-slim, copies app + JSON data |
| `frontend/Dockerfile` | Create | Node 22-alpine, Next.js standalone build |
| `docker-compose.prod.yml` | Create | 3 services: backend, frontend, nginx |
| `nginx/templates/flower.conf.template` | Create | Reverse proxy config |
| `scripts/deploy.sh` | Create | Pull → build → restart → health check |
| `.env` | Create | Domain name |
| `next.config.ts` | Modify | Add `output: "standalone"`, conditional rewrites |
| `frontend/src/lib/api.ts` | Modify | Conditional API_BASE (relative in prod) |
| `backend/app/main.py` | Modify | Environment-based CORS |
| `.github/workflows/deploy.yml` | Create | CI/CD auto-deploy on push |

---

## Execution Order

1. **Fix git repo** — commit + push initial code
2. **Modify `next.config.ts`** — add standalone output + conditional rewrites
3. **Modify `api.ts`** — relative URL in production
4. **Modify `main.py`** — env-based CORS
5. **Create Dockerfiles** — backend + frontend
6. **Create `docker-compose.prod.yml`** — 3 services
7. **Create Nginx template** — reverse proxy
8. **Create deploy script** — automated deployment
9. **Create `.env`** — domain config
10. **Create GitHub Actions workflow** — CI/CD
11. **Push to server** — clone + first deploy
12. **Configure Cloudflare Tunnel** — public access
13. **Verify** — curl health, open in browser

---

## Design Principle Notes

- **12-Factor App (III. Config):** Environment-based config via `.env` and env vars, no hardcoded URLs
- **12-Factor App (V. Build/Release/Run):** Docker images are immutable build artifacts; config injected at runtime
- **KISS:** No database, no auth, no monitoring stack — minimal moving parts
- **Separation of Concerns:** Nginx handles routing, frontend handles UI, backend handles data — each container does one thing
- **Non-root containers:** Both backend and frontend run as unprivileged users (security)
