#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/.env.production}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "환경 파일을 찾을 수 없습니다: ${ENV_FILE}" >&2
  echo "먼저 cp .env.production.example .env.production 을 실행하세요." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl이 필요합니다." >&2
  exit 1
fi

current_secret="$(sed -n 's/^PROXY_SHARED_SECRET=//p' "${ENV_FILE}" | tail -n 1)"

if [[ "${current_secret}" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "[security-gateway] 기존 PROXY_SHARED_SECRET을 유지합니다."
else
  new_secret="$(openssl rand -hex 32)"

  if grep -q '^PROXY_SHARED_SECRET=' "${ENV_FILE}"; then
    sed -i "s/^PROXY_SHARED_SECRET=.*/PROXY_SHARED_SECRET=${new_secret}/" "${ENV_FILE}"
  else
    printf '\nPROXY_SHARED_SECRET=%s\n' "${new_secret}" >> "${ENV_FILE}"
  fi

  chmod 600 "${ENV_FILE}"
  echo "[security-gateway] 64자리 프록시 비밀값을 생성했습니다."
fi

echo
echo "다음 명령으로 보안 게이트웨이와 서비스를 반영하세요."
echo "docker compose -f docker-compose.prod.yml --env-file .env.production --profile proxy up -d --build api web gateway caddy"
echo
echo "외부 방화벽에는 TCP 80/443만 허용하고 3000/4000은 열지 마세요."
