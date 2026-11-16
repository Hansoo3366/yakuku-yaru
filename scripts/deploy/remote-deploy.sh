#!/usr/bin/env bash
# GitHub Actions 가 IAP 터널 너머 서버에서 stdin 으로 실행하는 배포 스크립트.
# 첫 줄은 ghcr 로그인 토큰이고, 나머지 값은 ssh 명령에서 환경변수로 넘어온다.
# 필요한 값: DEPLOY_PATH, API_IMAGE, WEB_IMAGE, SENTRY_RELEASE, GHCR_USER, GHCR_TOKEN
set -euo pipefail

: "${DEPLOY_PATH:?}" "${API_IMAGE:?}" "${WEB_IMAGE:?}" "${SENTRY_RELEASE:?}" "${GHCR_USER:?}" "${GHCR_TOKEN:?}"
export API_IMAGE WEB_IMAGE SENTRY_RELEASE

cd "$DEPLOY_PATH"
git fetch origin main
git reset --hard origin/main

printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
unset GHCR_TOKEN

compose() {
  docker compose -f docker-compose.prod.yml --env-file .env.production --profile proxy "$@"
}

compose pull api web
compose up -d --no-build
compose up -d --no-build --force-recreate gateway
compose exec -T gateway nginx -t
compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile

wait_for() {
  local path="$1"
  for _ in $(seq 1 12); do
    if compose exec -T gateway wget -qO- "http://127.0.0.1:8080${path}" > /dev/null; then
      return 0
    fi
    sleep 5
  done
  echo "준비되지 않음: ${path}" >&2
  return 1
}

wait_for /api/health
wait_for /api-docs.json

# 새 버전이 뜬 뒤에 이전 이미지를 정리한다. (배포 전에 지우면 공통 레이어까지 다시 받게 된다)
docker container prune -f
docker image prune -af
docker logout ghcr.io
