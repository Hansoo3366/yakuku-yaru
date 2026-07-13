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

## 해결

### 1. 키 재생성

```bash
cd ~/yakuku-yaru
bash scripts/deploy/setup-github-actions-ssh.sh
```

출력된 **개인 키 전체** → GitHub `DEPLOY_SSH_KEY`

### 2. 지문 검증

```bash
# 서버
ssh-keygen -lf ~/.ssh/github_actions_yakuku_yaru.pub

# Actions 로그의 Deploy key fingerprint와 일치해야 함
```

### 3. GCP VM 메타데이터 SSH (권장)

브라우저 SSH 사용 시 `authorized_keys`가 사라지는 경우:

- 공개키를 VM → 수정 → SSH 키에 등록
- `DEPLOY_USER`와 키 끝 사용자명 일치

### 4. 로컬 테스트

```bash
ssh -i <private_key> <DEPLOY_USER>@<DEPLOY_HOST> "echo ok"
```

## 예방

- Secret 업데이트 시 삭제 후 재생성 (줄바꿈 보존)
- `DEPLOY_HOST`는 **외부 IP**
- workflow의 `key:`에 Secret 직접 전달 (key_path X)

## 관련

- [[Project/야크크 야르 섹시야구/05 배포 및 운영]]
- [[GHCR 이미지 분리 배포]]
