#!/usr/bin/env bash
# auckland.garden request pipeline — runs from ProDesk cron (every 30 min).
# Sources the repo .env for keys, then executes pipeline.py.
set -euo pipefail

cd /opt/flower-garden-project

# Load env (JWT_SECRET, PIPELINE_API_KEY, DEEPSEEK_API_KEY, ...)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export PIPELINE_API_KEY="${PIPELINE_API_KEY:-flower-pipeline-key-change-me}"
export PIPELINE_LLM_API_KEY="${PIPELINE_LLM_API_KEY:-${DEEPSEEK_API_KEY:-}}"
export PIPELINE_LLM_BASE_URL="${PIPELINE_LLM_BASE_URL:-https://api.deepseek.com}"
export PIPELINE_LLM_MODEL="${PIPELINE_LLM_MODEL:-deepseek-chat}"

mkdir -p data/pipeline
exec python3 scripts/pipeline/pipeline.py >> data/pipeline/pipeline.log 2>&1
