#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
LOCK_FILE="${LOCK_FILE:-/tmp/yakuku-kbo-sync.lock}"
BATCH_SIZE="${BATCH_SIZE:-20}"

cd "$PROJECT_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose 파일이 없습니다: $PROJECT_DIR/$COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "환경 파일이 없습니다: $PROJECT_DIR/$ENV_FILE" >&2
  exit 1
fi

DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

exec 9>"$LOCK_FILE"

if ! flock -n 9; then
  echo "다른 KBO 동기화가 실행 중입니다. 완료된 뒤 다시 실행하세요." >&2
  exit 1
fi

echo "[repair-player-identities] 최신 은퇴선수 매칭 코드 확인"

if ! "${DC[@]}" exec -T api grep -q \
  'resolveLineupPlayerSearchMatches' \
  /app/apps/api/dist/modules/kbo-game-center/sync-game-center.js; then
  echo "현재 API 이미지에 은퇴선수 매칭 수정이 반영되지 않았습니다." >&2
  echo "최신 코드를 받은 뒤 API 이미지를 다시 빌드·배포하세요." >&2
  exit 1
fi

if [[ "${SKIP_PLAYER_SYNC:-false}" == "true" ]]; then
  echo "[repair-player-identities] 전체 선수 동기화 건너뜀"
else
  echo "[repair-player-identities] 전체 선수 동기화"

  "${DC[@]}" exec -T api \
    node /app/apps/api/dist/scripts/sync-kbo-players.js
fi

echo "[repair-player-identities] 저장된 경기일 조회"

GAME_DATES_RAW="$(
  "${DC[@]}" exec -T mysql sh -c \
    'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -Nse "
      SELECT DATE_FORMAT(game_date, '\''%Y%m%d'\'') AS sync_date
      FROM games
      WHERE game_date <= CURRENT_DATE
      GROUP BY sync_date
      ORDER BY sync_date;
    "'
)"

GAME_DATES=()

if [[ -n "$GAME_DATES_RAW" ]]; then
  mapfile -t GAME_DATES <<< "$GAME_DATES_RAW"
fi

echo "[repair-player-identities] 동기화 대상 ${#GAME_DATES[@]}일"

for ((OFFSET = 0; OFFSET < ${#GAME_DATES[@]}; OFFSET += BATCH_SIZE)); do
  DATE_ARGS=()

  for GAME_DATE in "${GAME_DATES[@]:OFFSET:BATCH_SIZE}"; do
    if [[ -n "$GAME_DATE" ]]; then
      DATE_ARGS+=("--date=$GAME_DATE")
    fi
  done

  if [[ ${#DATE_ARGS[@]} -eq 0 ]]; then
    continue
  fi

  echo "[repair-player-identities] 경기센터 배치 $((OFFSET / BATCH_SIZE + 1)) 처리"

  "${DC[@]}" exec -T api \
    node /app/apps/api/dist/scripts/sync-kbo-game-center.js \
    "${DATE_ARGS[@]}"
done

echo "[repair-player-identities] 재동기화 완료, 삭제 대상 확인"

bash "$SCRIPT_DIR/cleanup-retired-players.sh"
