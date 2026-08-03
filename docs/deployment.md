# Deployment

이 문서는 Cloud Server 한 대에서 Docker Compose로 Yakuku Yaru를 배포하는 방법입니다.

## 배포 구조

```txt
Cloud Server
  ├─ caddy  HTTPS reverse proxy
  ├─ web    Next.js production server
  ├─ api    Express API server
  └─ mysql  MySQL 8.4
```

`web`과 `api` 포트는 서버의 loopback에만 바인딩하고, 외부 사용자는 Caddy를 통해서만 접근합니다.

```txt
127.0.0.1:3000       Web (서버 내부 확인용)
127.0.0.1:4000/api   API (서버 내부 확인용)
```

현재 제출용 배포는 도메인과 HTTPS를 기준으로 합니다.

```txt
https://yakuku-yaru.today          Web
https://yakuku-yaru.today/api      API
```

## 1. 서버 준비

Cloud Server에 Docker와 Docker Compose plugin을 설치합니다.

확인:

```bash
docker --version
docker compose version
```

## 2. 코드 받기

```bash
git clone <repository-url>
cd yakuku-yaru
```

## 3. 환경 변수 생성

```bash
cp .env.production.example .env.production
```

`.env.production`에서 반드시 수정합니다.

```env
NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN/api
APP_URL=https://YOUR_DOMAIN
APP_DOMAIN=YOUR_DOMAIN
JWT_SECRET=replace-with-a-long-random-secret
JWT_REMEMBER_EXPIRES_IN=30d
MYSQL_PASSWORD=replace-with-strong-password
MYSQL_ROOT_PASSWORD=replace-with-strong-root-password
```

`APP_URL`과 `NEXT_PUBLIC_API_URL`은 실제 HTTPS 서비스 도메인과 정확히 일치해야 합니다.

## 4. 컨테이너 실행

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 5. 상태 확인

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## 6. 로그 확인

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f mysql
```

## 7. 접속 확인

```txt
http://127.0.0.1:3000
http://127.0.0.1:4000/api/health
```

도메인 연결 후에는 아래 주소를 확인합니다.

```txt
https://yakuku-yaru.today
https://yakuku-yaru.today/api/health
https://yakuku-yaru.today/uploads/<uploaded-file-name>
```

## 8. 업데이트 배포

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

기존 업로드 중 DB에서 더 이상 참조하지 않는 파일은 먼저 dry run으로 확인한 뒤 정리합니다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npm run uploads:prune --workspace @yakuku-yaru/api
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npm run uploads:prune --workspace @yakuku-yaru/api -- --delete
```

## 9. GitHub Actions 자동 배포

`.github/workflows/deploy.yml`은 `main` 브랜치에 push되면 Google Cloud VM에 SSH로 접속해 최신 코드를 받고 Docker Compose를 다시 실행합니다.

서버에는 이미 아래 준비가 되어 있어야 합니다.

- Docker와 Docker Compose plugin 설치
- repository clone 완료
- repository 루트에 `.env.production` 생성 완료
- 서버의 SSH key가 GitHub repository 접근 권한을 가짐

GitHub repository에서 아래 Secrets를 등록합니다.

```txt
DEPLOY_HOST      Google Cloud VM 외부 IP
DEPLOY_USER      VM SSH 사용자명
DEPLOY_SSH_KEY   VM에 접속할 private key
DEPLOY_PATH      서버의 repository 절대 경로
DEPLOY_PORT      SSH 포트, 기본값은 22
DEPLOY_COMPOSE_PROFILES  선택 값. Caddy를 켤 때 proxy
NEXT_PUBLIC_API_URL  빌드 시 web 이미지에 주입할 API URL
```

예시:

```txt
DEPLOY_HOST=34.000.000.000
DEPLOY_USER=hanso3366
DEPLOY_PATH=/home/hanso3366/yakuku-yaru
DEPLOY_PORT=22
DEPLOY_COMPOSE_PROFILES=proxy
NEXT_PUBLIC_API_URL=https://yakuku-yaru.today/api
```

GitHub Actions는 `api`, `web` Docker 이미지를 GitHub Container Registry(GHCR)에 먼저 빌드/push합니다.
서버는 이미지를 pull한 뒤 `docker compose up -d --no-build`로 교체만 수행합니다.
따라서 e2-small 같은 작은 VM에서도 배포 중 서버가 직접 Next.js 빌드를 수행하지 않습니다.

`DEPLOY_SSH_KEY`는 GitHub가 서버에 접속할 때 사용할 **private key**입니다. 서버에서 한 번만 실행합니다.

```bash
cd ~/yakuku-yaru
bash scripts/deploy/setup-github-actions-ssh.sh
```

스크립트가 `authorized_keys`에 공개키를 넣고, `DEPLOY_SSH_KEY`에 붙여 넣을 private key를 출력합니다.

수동으로 할 경우:

```bash
ssh-keygen -t ed25519 -C "github-actions-yakuku-yaru" -f ~/.ssh/github_actions_yakuku_yaru -N ""
chmod 600 ~/.ssh/github_actions_yakuku_yaru ~/.ssh/authorized_keys
chmod 700 ~/.ssh
cat ~/.ssh/github_actions_yakuku_yaru.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_yakuku_yaru   # ← 이 출력 전체가 DEPLOY_SSH_KEY
```

**주의:** `.pub` 파일이 아니라 **private key**(`BEGIN OPENSSH PRIVATE KEY`)를 Secret에 넣습니다.

수동으로 자동 배포를 테스트하려면 GitHub Actions 화면에서 `Deploy to Google Cloud VM` workflow의 `Run workflow`를 실행합니다.

### SSH 인증 실패 (`unable to authenticate, attempted methods [none publickey]`)

KBO 크롤 workflow가 아니라 **`Deploy to Google Cloud VM`** 배포 단계에서 나는 오류입니다.

`deploy.yml`은 `appleboy/ssh-action`에 **`key:`(Secret 내용)** 을 넘깁니다. 이전 단계에서 runner의 `~/.ssh/deploy_key`를 만들고 `key_path`로 가리키면 **동작하지 않습니다**. ssh-action은 Docker 컨테이너 안에서 실행되어 runner 홈 디렉터리의 파일을 읽을 수 없기 때문입니다.

Secret과 서버 `authorized_keys`가 맞지 않을 때도 같은 메시지가 납니다.

#### A. 서버 (GCP SSH 또는 브라우저 SSH)

```bash
cd ~/yakuku-yaru
git pull   # setup 스크립트가 있으면
bash scripts/deploy/setup-github-actions-ssh.sh
```

출력된 **private key 전체**를 복사해 둡니다.

서버에서 지문 확인:

```bash
ssh-keygen -lf ~/.ssh/github_actions_yakuku_yaru.pub
```

#### B. GitHub Secrets (Repository → Settings → Secrets → Actions)

| Secret | 값 |
|--------|-----|
| `DEPLOY_USER` | 서버 `whoami` 결과 (예: `hanso3366`) |
| `DEPLOY_HOST` | GCP VM **외부 IP** (내부 IP 아님) |
| `DEPLOY_PATH` | `/home/hanso3366/yakuku-yaru` |
| `DEPLOY_SSH_KEY` | A에서 복사한 private key **전체** (BEGIN~END, 따옴표 없음) |

`DEPLOY_SSH_KEY`는 **Update**로 덮어쓰기. 줄바꿈이 깨지면 Secret을 삭제 후 새로 만드는 편이 낫습니다.

#### 권장: GCP VM 메타데이터 SSH key 사용

GCP 브라우저 SSH를 자주 쓰거나 OS Login/metadata 설정 때문에 `authorized_keys`가 사라지는 경우가 있습니다. 이때는 GitHub Actions용 공개키를 **VM 메타데이터 SSH 키**에 등록하는 방식이 더 안정적입니다.

1. GitHub Actions용 key pair를 생성합니다.
2. private key 전체를 `DEPLOY_SSH_KEY` Secret에 넣습니다.
3. public key 내용을 GCP Console의 VM → `수정` → `SSH 키`에 추가합니다.
4. 형식은 보통 `ssh-ed25519 AAAA... hanso3366` 입니다. 맨 끝 사용자명이 `DEPLOY_USER`와 같아야 합니다.

이 방식을 쓰면 서버 안의 `~/.ssh/authorized_keys`가 없어져도 VM 메타데이터가 다시 키를 주입하므로 반복 장애가 줄어듭니다.

#### C. Mac에서 접속 테스트 (선택, 권장)

서버에서 private key 파일을 Mac으로 복사한 뒤:

```bash
chmod 600 ~/Downloads/github_actions_yakuku_yaru
ssh -i ~/Downloads/github_actions_yakuku_yaru hanso3366@VM외부IP "echo ok"
```

`ok`가 나오면 Secret도 동일 키이므로 Actions가 통과해야 합니다.

#### D. Actions 재실행

`Deploy to Google Cloud VM` → **Run workflow**

**Validate deployment secrets** 로그에 `Deploy key fingerprint`가 나옵니다. 서버의 `ssh-keygen -lf ~/.ssh/github_actions_yakuku_yaru.pub` 지문과 **같아야** 합니다. 다르면 Secret에 잘못된 키가 들어간 것입니다.

#### E. 그래도 실패할 때

- GCP VM에 **OS Login**이 켜져 있으면 `~/.ssh/authorized_keys`가 무시될 수 있습니다. 메타데이터에서 OS Login을 끄거나, OS Login용 키를 등록해야 합니다.
- `DEPLOY_USER`가 키를 넣은 계정과 다른 경우 (예: `ubuntu` vs `hanso3366`)
- 방화벽: SSH 22는 열려 있어야 함 (연결 자체가 안 되면 timeout, 지금은 auth 실패)

## 10. DuckDNS and HTTPS

도메인 구매 비용을 줄이려면 DuckDNS 무료 서브도메인을 사용할 수 있습니다.

1. DuckDNS에서 서브도메인을 생성합니다.
2. DuckDNS의 IP 값을 Google Cloud VM 외부 IP로 설정합니다.
3. Google Cloud 방화벽에서 `80`, `443` 포트가 열려 있는지 확인합니다.
4. 서버의 `.env.production`에서 도메인 값을 수정합니다.

```env
NEXT_PUBLIC_API_URL=https://YOUR_SUBDOMAIN.duckdns.org/api
APP_DOMAIN=YOUR_SUBDOMAIN.duckdns.org
```

5. 서버에서 다시 배포합니다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile proxy up -d
```

Caddy는 `APP_DOMAIN` 기준으로 Let's Encrypt 인증서를 자동 발급하고 갱신합니다.

GitHub Actions 자동 배포에서도 Caddy를 함께 실행하려면 repository secret에 아래 값을 추가합니다.

```txt
DEPLOY_COMPOSE_PROFILES=proxy
```

Google Cloud 방화벽에서도 `3000`, `4000` 포트는 닫고 `80`, `443`만 외부에 열어둡니다.

## 10-1. 운영 환경 변수

`.env.production`에는 최소 아래 값이 필요합니다.

```env
NODE_ENV=production
APP_URL=https://yakuku-yaru.today
APP_DOMAIN=yakuku-yaru.today
NEXT_PUBLIC_API_URL=https://yakuku-yaru.today/api

JWT_SECRET=replace-with-long-random-secret
JWT_EXPIRES_IN=1d
JWT_REMEMBER_EXPIRES_IN=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM="야크크 야르 <your-gmail@gmail.com>"
```

`.env.production`만 수정했을 때는 Caddy만 재시작하면 안 되고, 해당 환경 변수를 사용하는 `api`와 필요 시 `web` 컨테이너를 다시 올려야 합니다.

GitHub Actions 배포에서는 이미지를 Actions에서 빌드하므로 서버에서 `--build`를 붙이지 않습니다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile proxy up -d --no-build api web caddy
```

## 11. 데이터 보존

MySQL 데이터와 업로드 파일은 Docker volume에 저장됩니다.

- `mysql_data`
- `api_uploads`
- `caddy_data`
- `caddy_config`

컨테이너를 재빌드해도 volume은 유지됩니다.

주의:

```bash
docker compose -f docker-compose.prod.yml down -v
```

위 명령은 DB와 업로드 파일 volume을 삭제합니다.

업로드 이미지가 서버 디스크를 많이 차지하면 NAS/NFS/SMB를 서버에 마운트한 뒤
`.env.production`에 호스트 경로를 지정할 수 있습니다. 지정하지 않으면 기존처럼
`api_uploads` Docker volume을 사용합니다.

```env
UPLOADS_HOST_DIR=/mnt/yakuku-uploads
```

기존 업로드 파일을 NAS 마운트 경로로 옮긴 뒤 API를 다시 올립니다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop api
docker run --rm -v yakuku-yaru_api_uploads:/from:ro -v /mnt/yakuku-uploads:/to alpine sh -c 'cd /from && tar cf - . | tar xf - -C /to'
docker compose --env-file .env.production -f docker-compose.prod.yml up -d api
```

## 12. 다음 개선

실서비스 수준으로 올릴 때는 아래 구성을 추가하는 것이 좋습니다.

- MySQL managed DB 또는 별도 DB 서버
- 업로드 파일 object storage
- Blue-green 배포
