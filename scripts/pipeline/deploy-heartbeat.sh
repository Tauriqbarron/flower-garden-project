#!/usr/bin/env bash
# Deploy heartbeat — safety net for dropped GitHub Actions push triggers.
#
# GitHub occasionally fails to create a workflow run for a push (the runner
# stays online but never receives a job). Every 5 minutes this cron checks
# whether origin/main is ahead of the deployed checkout and force-deploys if
# so. deploy.sh's flock makes concurrent runner/heartbeat/pipeline deploys safe.
set -euo pipefail

cd /opt/flower-garden-project

git fetch -q origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "[$(date -Is)] origin/main ahead: local=${LOCAL:0:7} remote=${REMOTE:0:7} — deploying"
  FORCE_DEPLOY=1 bash scripts/deploy.sh
else
  echo "[$(date -Is)] up to date (${LOCAL:0:7})"
fi
