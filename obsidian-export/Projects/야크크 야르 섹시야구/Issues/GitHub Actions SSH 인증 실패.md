# GitHub Actions SSH 인증 실패

## 증상

`Deploy to Google Cloud VM` workflow에서:

```
unable to authenticate, attempted methods [none publickey]
```

## 원인

1. **`DEPLOY_SSH_KEY` Secret 불일치** — 개인 키 전체가 아니거나 줄바꿈이 깨짐
2. **서버 `authorized_keys`와 키 쌍 불일치**
3. **GCP OS Login** — metadata SSH와 authorized_keys 충돌
4. (과거) `key_path`로 runner 파일 참조 — ssh-action은 Docker 안에서 실행되어 runner 홈 접근 불가

## 해결 (2026-11-16 이후 방식)

> 지금은 IAP 터널 + 배포 전용 사용자 `deploy`로 접속한다. → [[IAP 터널과 배포 전용 사용자]]
> 아래 예전 방식(`setup-github-actions-ssh.sh`, `DEPLOY_HOST`, 메타데이터 등록)은 더 쓰지 않는다.

### 1. 키 재생성

```bash
cd ~/yakuku-yaru
sudo bash scripts/deploy/setup-deploy-user.sh
```

출력된 **개인 키 전체** → GitHub `DEPLOY_SSH_KEY`, `DEPLOY_USER` = `deploy`

### 2. 지문 검증

```bash
# 서버
sudo ssh-keygen -lf /home/deploy/.ssh/authorized_keys

# Actions 로그의 "Deploy key fingerprint"와 일치해야 함
```

### 3. 메타데이터에 넣지 않기

배포 키를 VM → 수정 → SSH 키(메타데이터)에 **등록하지 않는다**. `deploy`는 GCP가 관리하지 않는 사용자라 브라우저 SSH를 써도 키가 지워지지 않는다. 메타데이터에 넣으면 운영 계정에 셸 권한 키로 다시 생긴다.

### 4. 자주 보는 오류

| 오류 | 확인 |
|------|------|
| `Permission denied (publickey)` | 지문 비교, `DEPLOY_USER`가 `deploy`인지 |
| `허용되지 않은 명령입니다` | workflow의 ssh 명령이 `deploy <SHA> <사용자>` 꼴인지 |
| `sudo: a password is required` | `/etc/sudoers.d/yakuku-deploy`가 있는지, setup 스크립트 재실행 |
| `Host key verification failed` | VM을 새로 만들었으면 `deploy.yml`의 `DEPLOY_HOST_KEY` 교체 |

## 예방

- Secret 업데이트 시 삭제 후 재생성 (줄바꿈 보존)
- workflow의 `key:`에 Secret 직접 전달 (key_path X)

## 관련

- [[Project/야크크 야르 섹시야구/05 배포 및 운영]]
- [[GHCR 이미지 분리 배포]]
- [[IAP 터널과 배포 전용 사용자]]
