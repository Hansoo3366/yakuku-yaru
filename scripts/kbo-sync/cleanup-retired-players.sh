#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"

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

echo "[cleanup-retired-players] 삭제 대상 조회"

TARGET_COUNT="$("${DC[@]}" exec -T mysql sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -Nse "
    SELECT COUNT(*)
    FROM players
    WHERE is_active = FALSE
      AND (back_number IS NULL OR LENGTH(TRIM(back_number)) = 0);
  "')"

if [[ "$TARGET_COUNT" == "0" ]]; then
  echo "삭제할 선수가 없습니다."
  exit 0
fi

"${DC[@]}" exec -T mysql sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" --table -e "
    SELECT
      p.id,
      t.short_name AS team,
      p.name,
      p.kbo_player_id,
      p.back_number,
      p.is_active
    FROM players p
    JOIN teams t ON t.id = p.team_id
    WHERE p.is_active = FALSE
      AND (p.back_number IS NULL OR LENGTH(TRIM(p.back_number)) = 0)
    ORDER BY t.short_name, p.name, p.id;
  "'

echo
echo "삭제 대상: ${TARGET_COUNT}명"
echo "조건: is_active = FALSE 이고 등번호가 NULL 또는 빈 문자열"
echo "연결된 라인업, 선발투수, 응원가도 외래키 규칙에 따라 함께 삭제됩니다."
echo

if [[ "${1:-}" != "--yes" ]]; then
  read -r -p "계속하려면 DELETE를 입력하세요: " CONFIRM

  if [[ "$CONFIRM" != "DELETE" ]]; then
    echo "취소했습니다."
    exit 0
  fi
fi

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/player-cleanup-$(date +%Y%m%d-%H%M%S).sql"

echo "[cleanup-retired-players] 백업 생성: $BACKUP_FILE"

"${DC[@]}" exec -T mysql sh -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" players player_cheers game_lineups game_starting_pitchers' \
  > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "백업 파일이 비어 있어 삭제를 중단합니다: $BACKUP_FILE" >&2
  exit 1
fi

echo "[cleanup-retired-players] 삭제 시작"

"${DC[@]}" exec -T mysql sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' <<'SQL'
START TRANSACTION;

CREATE TEMPORARY TABLE retired_players_to_delete (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
);

INSERT INTO retired_players_to_delete (id)
SELECT id
FROM players
WHERE is_active = FALSE
  AND NULLIF(TRIM(back_number), '') IS NULL;

SELECT
  COUNT(*) AS players_to_delete,
  (
    SELECT COUNT(*)
    FROM game_lineups gl
    JOIN retired_players_to_delete target ON target.id = gl.player_id
  ) AS lineups_to_delete,
  (
    SELECT COUNT(*)
    FROM game_starting_pitchers gsp
    JOIN retired_players_to_delete target ON target.id = gsp.player_id
  ) AS pitchers_to_delete,
  (
    SELECT COUNT(*)
    FROM player_cheers pc
    JOIN retired_players_to_delete target ON target.id = pc.player_id
  ) AS cheers_to_delete
FROM retired_players_to_delete;

DELETE p
FROM players p
JOIN retired_players_to_delete target ON target.id = p.id;

SELECT ROW_COUNT() AS deleted_players;

COMMIT;

SELECT COUNT(*) AS remaining_targets
FROM players
WHERE is_active = FALSE
  AND NULLIF(TRIM(back_number), '') IS NULL;
SQL

echo "[cleanup-retired-players] 완료"
echo "백업: $BACKUP_FILE"
