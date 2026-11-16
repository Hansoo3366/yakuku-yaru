#!/usr/bin/env bash
# GCP VM에서 GitHub Actions 배포용 SSH 키를 만들고 authorized_keys에 등록합니다.
# 사용: bash scripts/deploy/setup-github-actions-ssh.sh
set -euo pipefail

KEY_NAME="${KEY_NAME:-github_actions_yakuku_yaru}"
KEY_PATH="${HOME}/.ssh/${KEY_NAME}"

mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"

if [[ -f "$KEY_PATH" || -f "$KEY_PATH.pub" ]]; then
  echo "이미 키가 있습니다: $KEY_PATH(.pub)"
  echo "새로 만들려면 먼저 삭제하세요: rm -f $KEY_PATH $KEY_PATH.pub"
  exit 1
fi

ssh-keygen -t ed25519 -C "github-actions-yakuku-yaru" -f "$KEY_PATH" -N ""

chmod 600 "$KEY_PATH"
chmod 644 "$KEY_PATH.pub"

# 중복 없이 공개키 추가
touch "${HOME}/.ssh/authorized_keys"
chmod 600 "${HOME}/.ssh/authorized_keys"
if ! grep -qF "$(cat "$KEY_PATH.pub")" "${HOME}/.ssh/authorized_keys"; then
  cat "$KEY_PATH.pub" >> "${HOME}/.ssh/authorized_keys"
fi

echo ""
echo "=== 서버 공개키 지문 (authorized_keys에 등록됨) ==="
ssh-keygen -lf "$KEY_PATH.pub"
echo ""
echo "=== GitHub Secret DEPLOY_SSH_KEY 에 넣을 내용 (아래 전체 복사) ==="
echo "----- 복사 시작 -----"
cat "$KEY_PATH"
echo "----- 복사 끝 -----"

# private key 는 GitHub Secret 에만 둔다. 서버에 남겨 두지 않는다.
rm -f "$KEY_PATH"
echo ""
echo "서버의 private key 파일은 지웠습니다. 위 내용을 Secret 에 넣기 전에 창을 닫지 마세요."
echo ""
echo "GitHub: Repository → Settings → Secrets and variables → Actions"
echo "  DEPLOY_USER = $(whoami)"
echo "  DEPLOY_PATH = $(cd "$(dirname "$0")/../.." 2>/dev/null && pwd || echo '/home/$(whoami)/yakuku-yaru')"
echo "  DEPLOY_SSH_KEY = 위 private key 전체 (BEGIN~END 포함)"
