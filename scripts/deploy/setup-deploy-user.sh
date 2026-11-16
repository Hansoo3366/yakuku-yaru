#!/usr/bin/env bash
# GitHub Actions 배포 전용 사용자(deploy)와 SSH 키를 만든다. 서버에서 한 번만 실행한다.
# 사용: cd ~/yakuku-yaru && sudo bash scripts/deploy/setup-deploy-user.sh
#
# deploy 사용자는 셸을 쓸 수 없고, 키로 할 수 있는 일은 /usr/local/bin/yakuku-deploy 실행뿐이다.
# 그 명령은 커밋 SHA 만 받아 운영 계정(sudo 를 실행한 사용자)으로 remote-deploy.sh 를 돌린다.
# 다시 실행하면 키를 새로 만들어 바꾼다.
set -euo pipefail

DEPLOY_USER=deploy

if [[ "$(id -u)" -ne 0 ]]; then
  echo "sudo 로 실행하세요: sudo bash $0" >&2
  exit 1
fi

RUN_AS="${SUDO_USER:-}"
if [[ -z "$RUN_AS" || "$RUN_AS" == root ]]; then
  echo "운영 계정에서 sudo 로 실행하세요. (root 로 직접 실행하면 운영 계정을 알 수 없습니다)" >&2
  exit 1
fi

DEPLOY_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ ! -f "$DEPLOY_PATH/.env.production" ]]; then
  echo "저장소 경로가 아닌 것 같습니다: $DEPLOY_PATH (.env.production 없음)" >&2
  exit 1
fi

# 1. 사용자. 비밀번호 로그인은 막고('*'), 공개키 로그인만 쓴다.
if ! id "$DEPLOY_USER" > /dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi
usermod -p '*' "$DEPLOY_USER"

# 2. 허용 명령과 설정. root 소유라 deploy 도 운영 계정도 고칠 수 없다.
install -o root -g root -m 755 "$DEPLOY_PATH/scripts/deploy/yakuku-deploy" /usr/local/bin/yakuku-deploy
printf 'RUN_AS=%q\nDEPLOY_PATH=%q\n' "$RUN_AS" "$DEPLOY_PATH" > /etc/yakuku-deploy.conf
chown root:root /etc/yakuku-deploy.conf
chmod 644 /etc/yakuku-deploy.conf

# 3. deploy 는 그 명령만 운영 계정으로 실행할 수 있다.
SUDOERS_TMP="$(mktemp)"
printf '%s ALL=(%s) NOPASSWD: /usr/local/bin/yakuku-deploy\n' "$DEPLOY_USER" "$RUN_AS" > "$SUDOERS_TMP"
visudo -cf "$SUDOERS_TMP" > /dev/null
install -o root -g root -m 440 "$SUDOERS_TMP" /etc/sudoers.d/yakuku-deploy
rm -f "$SUDOERS_TMP"

# 4. 키. authorized_keys 는 root 소유로 두어 deploy 가 바꿀 수 없게 한다.
KEY_DIR="$(mktemp -d)"
trap 'rm -rf "$KEY_DIR"' EXIT
ssh-keygen -q -t ed25519 -C "github-actions-deploy" -f "$KEY_DIR/key" -N ""

DEPLOY_HOME="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
install -o root -g root -m 755 -d "$DEPLOY_HOME/.ssh"
printf 'restrict,command="/usr/local/bin/yakuku-deploy" %s\n' "$(cat "$KEY_DIR/key.pub")" > "$DEPLOY_HOME/.ssh/authorized_keys"
chown root:root "$DEPLOY_HOME/.ssh/authorized_keys"
chmod 644 "$DEPLOY_HOME/.ssh/authorized_keys"

if sshd -T 2> /dev/null | grep -qiE '^(allowusers|allowgroups) '; then
  echo ""
  echo "주의: sshd 에 AllowUsers/AllowGroups 가 있습니다. $DEPLOY_USER 를 추가해야 접속됩니다."
  sshd -T | grep -iE '^(allowusers|allowgroups) '
fi

echo ""
echo "=== 공개키 지문 (deploy 사용자에 등록됨) ==="
ssh-keygen -lf "$KEY_DIR/key.pub"
echo ""
echo "=== GitHub Secret DEPLOY_SSH_KEY 에 넣을 내용 (아래 전체 복사) ==="
echo "----- 복사 시작 -----"
cat "$KEY_DIR/key"
echo "----- 복사 끝 -----"
echo ""
echo "private key 는 이 창에만 보이고 서버에는 남기지 않습니다. Secret 에 넣기 전에 창을 닫지 마세요."
echo ""
echo "GitHub: Repository → Settings → Secrets and variables → Actions"
echo "  DEPLOY_USER    = $DEPLOY_USER"
echo "  DEPLOY_SSH_KEY = 위 private key 전체 (BEGIN~END 포함)"
