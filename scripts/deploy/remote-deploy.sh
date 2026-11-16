#!/usr/bin/env bash
# GitHub Actions 가 IAP 터널 너머 서버에서 stdin 으로 실행하는 배포 스크립트.
# 첫 줄은 ghcr 로그인 토큰이고, 나머지 값은 ssh 명령에서 환경변수로 넘어온다.
# 필요한 값: DEPLOY_PATH, API_IMAGE, WEB_IMAGE, SENTRY_RELEASE, GHCR_USER, GHCR_TOKEN
#
# 스크립트 자체가 stdin 으로 들어오므로, 본문을 함수로 감싸 끝까지 읽은 뒤 실행하고
# 함수의 stdin 은 /dev/null 로 막는다. 그러지 않으면 `docker compose exec` 같은 명령이
# 남은 스크립트를 stdin 으로 삼켜 중간에 조용히 끝나 버린다.
# 마지막 줄의 DEPLOY_OK 는 workflow 가 끝까지 실행됐는지 확인하는 표시다.
set -euo pipefail

compose() {
  docker compose -f docker-compose.prod.yml --env-file .env.production --profile proxy "$@"
}

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

# 새 이미지로 떠 있고, 죽었다 살아난 적이 없는지 컨테이너를 직접 확인한다.
verify_container() {
  local service="$1" expected_image="$2" id status restarts image
  id="$(compose ps -q "$service")"
  if [ -z "$id" ]; then
    echo "컨테이너 없음: ${service}" >&2
    return 1
  fi
  read -r status restarts image < <(docker inspect -f '{{.State.Status}} {{.RestartCount}} {{.Config.Image}}' "$id")
  echo "${service}: ${status}, 재시작 ${restarts}회, ${image}"
  if [ "$status" != running ] || [ "$restarts" != 0 ] || [ "$image" != "$expected_image" ]; then
    echo "비정상 컨테이너: ${service}" >&2
    return 1
  fi
}

verify_release() {
  wait_for /api/health
  wait_for /api-docs.json
  wait_for /
  verify_container api "$API_IMAGE"
  verify_container web "$WEB_IMAGE"
}

main() {
  : "${DEPLOY_PATH:?}" "${API_IMAGE:?}" "${WEB_IMAGE:?}" "${SENTRY_RELEASE:?}" "${GHCR_USER:?}" "${GHCR_TOKEN:?}"
  export API_IMAGE WEB_IMAGE SENTRY_RELEASE

  cd "$DEPLOY_PATH"
  git fetch origin main
  git reset --hard origin/main

  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
  unset GHCR_TOKEN
  trap 'docker logout ghcr.io > /dev/null 2>&1 || true' EXIT

  compose pull api web
  compose up -d --no-build
  compose up -d --no-build --force-recreate gateway
  compose exec -T gateway nginx -t
  compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile

  verify_release
  # 뜨자마자 죽는 경우(의존성 누락, 환경변수 오류)를 잡기 위해 잠시 뒤 한 번 더 본다.
  sleep 20
  verify_release

  # 새 버전이 뜬 뒤에 이전 이미지를 정리한다. (배포 전에 지우면 공통 레이어까지 다시 받게 된다)
  docker container prune -f
  docker image prune -af

  echo "DEPLOY_OK ${SENTRY_RELEASE}"
}

main "$@" < /dev/null
