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
git fetch origin main
git reset --hard origin/main
CURRENT_COMMIT="$(git rev-parse HEAD)"

if [ "$PREVIOUS_COMMIT" = "$CURRENT_COMMIT" ]; then
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log "No changes. Healthy. Done."
        exit 0
    fi
    log "No changes but unhealthy — rebuilding..."
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
