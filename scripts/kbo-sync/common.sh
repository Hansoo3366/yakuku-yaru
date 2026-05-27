#!/usr/bin/env bash
# shellcheck source=/dev/null
set -euo pipefail

if [[ -z "${BATCH_NAME:-}" ]]; then
  echo "BATCH_NAME must be set before sourcing common.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
LOCK_FILE="${LOCK_FILE:-/tmp/yakuku-kbo-sync.lock}"
LOG_DIR="${LOG_DIR:-$PROJECT_DIR/logs/kbo-sync}"

cd "$PROJECT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[$BATCH_NAME] Missing $PROJECT_DIR/$ENV_FILE" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y%m%d-%H%M%S)-${BATCH_NAME}.log"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "[$BATCH_NAME] 시작 $(date -Iseconds)"
echo "[$BATCH_NAME] project=$PROJECT_DIR log=$LOG_FILE"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$BATCH_NAME] 다른 KBO sync가 실행 중이라 건너뜁니다."
  exit 0
fi

DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api)

run_in_api() {
  echo "[$BATCH_NAME] \$ $*"
  "${DC[@]}" sh -c "$*"
}

on_finish() {
  local code=$?
  if [[ $code -eq 0 ]]; then
    echo "[$BATCH_NAME] 완료 $(date -Iseconds)"
  else
    echo "[$BATCH_NAME] 실패 (exit $code) $(date -Iseconds)" >&2
  fi
}

trap on_finish EXIT
