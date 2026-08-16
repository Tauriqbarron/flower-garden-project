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

# Single-instance lock — the runner, the deploy heartbeat cron and the request
# pipeline can all fire deploy.sh; never run two at once (git reset races).
LOCK_FILE="/tmp/flower-deploy.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    log "Another deploy is in progress — skipping this run."
    exit 0
fi

# Compare against the last-known REMOTE state (not local HEAD): the request
# pipeline commits+pushes from this same checkout, so local HEAD may already
# equal origin/main when the runner fires — that must still trigger a rebuild.
# FORCE_DEPLOY=1 (deploy heartbeat) skips the check entirely.
PREVIOUS_COMMIT="$(git rev-parse origin/main 2>/dev/null || git rev-parse HEAD)"
log "Pulling latest..."
git fetch origin main
git reset --hard origin/main
CURRENT_COMMIT="$(git rev-parse HEAD)"

if [ -z "${FORCE_DEPLOY:-}" ] && [ "$PREVIOUS_COMMIT" = "$CURRENT_COMMIT" ]; then
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log "No changes. Healthy. Done."
        exit 0
    fi
    log "No changes but unhealthy — rebuilding..."
fi

# Always --pull. Both Dockerfiles use floating base tags (python:3.11-slim,
# node:22-alpine), so pulling is what actually picks up upstream security
# patches. When the base digest changes every layer below FROM rebuilds anyway,
# including the frontend's `apk upgrade` — which is the property the old blanket
# --no-cache was really buying. When nothing upstream moved and deps are
# unchanged, the cached layers are reused and no new ones accumulate.
#
# Blanket --no-cache rebuilt every layer on every deploy. With deploys firing as
# often as every 5 minutes (heartbeat) it grew 51 GB of build cache and filled
# the disk to 85%. Set FORCE_REBUILD=1 to opt back into a full clean rebuild.
BUILD_ARGS=(--pull)
if [ -n "${FORCE_REBUILD:-}" ]; then
    log "FORCE_REBUILD set — full clean rebuild"
    BUILD_ARGS+=(--no-cache)
fi

log "Building images..."
docker compose -f "$COMPOSE_FILE" build "${BUILD_ARGS[@]}" backend frontend

log "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate

log "Health check..."
for i in $(seq 1 "$MAX_RETRIES"); do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log "Healthy (attempt $i). Deploy complete."
        docker image prune -f > /dev/null 2>&1
        # Cap build-cache growth. Anything untouched for a week is not being
        # reused by incremental builds, so dropping it costs nothing but keeps
        # the 98 GB root from filling again.
        docker builder prune -f --filter until=168h > /dev/null 2>&1 || true
        exit 0
    fi
    sleep "$INTERVAL"
done

log "ERROR: Health check failed after $MAX_RETRIES attempts"
log "=== Container logs for debugging ==="
docker compose -f "$COMPOSE_FILE" logs --tail=30 backend frontend nginx
exit 1
