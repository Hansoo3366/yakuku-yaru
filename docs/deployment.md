# Deployment

이 문서는 Cloud Server 한 대에서 Docker Compose로 Yakuku Yaru를 배포하는 방법입니다.

## 배포 구조

```txt
Cloud Server
  ├─ caddy  HTTPS reverse proxy
  ├─ gateway Nginx rate/connection limiter
  ├─ web    Next.js production server
  ├─ api    Express API server
  └─ mysql  MySQL 8.4
```

`web`과 `api` 포트는 서버의 loopback에만 바인딩하고, 외부 사용자는 Caddy를 통해서만 접근합니다. 도메인 요청은 `Caddy → gateway → web/api` 순서로 전달됩니다.

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
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_REMEMBER_EXPIRES_IN=30d
MYSQL_PASSWORD=replace-with-strong-password
MYSQL_ROOT_PASSWORD=replace-with-strong-root-password
```

`APP_URL`과 `NEXT_PUBLIC_API_URL`은 실제 HTTPS 서비스 도메인과 정확히 일치해야 합니다.

인증 토큰 분리 배포에서는 API가 시작될 때 `refresh_sessions` 테이블을 자동 생성합니다. 별도 SQL 실행은 필요하지 않습니다. 기존 `yakuku_session` 쿠키는 새 인증 구조에서 사용하지 않으므로 배포 후 사용자는 최초 한 번 다시 로그인합니다.

## 4. 컨테이너 실행

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile proxy up -d --build
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
https://yakuku-yaru.today/uploads/<uuid-image-file-name>
```

## 8. 업데이트 배포

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml --profile proxy up -d --build
```

기존 업로드 중 DB에서 더 이상 참조하지 않는 파일은 먼저 dry run으로 확인한 뒤 정리합니다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npm run uploads:prune --workspace @yakuku-yaru/api
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npm run uploads:prune --workspace @yakuku-yaru/api -- --delete
```

## 9. GitHub Actions 자동 배포

`.github/workflows/deploy.yml`은 `main` 브랜치에 push되면 이미지를 빌드하고, IAP 터널을 거쳐 서버에 배포 전용 사용자 `deploy`로 접속합니다. 서버는 저장소를 최신 `main`으로 맞춘 뒤 `scripts/deploy/remote-deploy.sh`를 실행합니다.

```txt
GitHub Actions ─(Workload Identity)→ GCP 로그인
               ─(IAP 터널, localhost:2222)→ VM 22번
               ─(ssh deploy@, 호스트 키 검사)→ /usr/local/bin/yakuku-deploy
               ─(sudo, 운영 계정)→ git reset → remote-deploy.sh
```

- 서버 SSH 22번은 IAP 대역(`35.235.240.0/20`)에만 열려 있습니다. 외부 IP로 직접 SSH 할 수 없습니다.
- GitHub Actions는 키 파일 없이 Workload Identity로 GCP에 로그인합니다. 이 저장소의 `main`에서 돈 workflow만 로그인할 수 있습니다.
- 모든 Action은 커밋 SHA로 고정합니다. 버전을 올릴 때도 태그 대신 SHA를 적습니다.
- `deploy` 사용자의 키로는 셸을 열 수 없습니다. 할 수 있는 일은 `deploy <커밋 SHA> <GitHub 사용자>` 하나뿐이고, 포트 포워딩도 막혀 있습니다 (`authorized_keys`의 `restrict,command=`). 키가 새도 이미 올라간 이미지로 다시 배포하는 것밖에 못 합니다.
- `remote-deploy.sh`는 새 API·웹 컨테이너가 새 이미지로 떠 있고 재시작이 없는지 20초 간격으로 두 번 확인합니다. 마지막 줄 `DEPLOY_OK <SHA>`가 없으면 workflow가 실패합니다.

서버에는 이미 아래 준비가 되어 있어야 합니다.

- Docker와 Docker Compose plugin 설치
- repository를 https로 clone (공개 저장소라 서버에 GitHub 키를 두지 않습니다)
- repository 루트에 `.env.production` 생성 (권한 600)

### GitHub Secrets

```txt
DEPLOY_USER             deploy (배포 전용 사용자)
DEPLOY_SSH_KEY          deploy 사용자의 private key
NEXT_PUBLIC_API_URL     빌드 시 web 이미지에 주입할 API URL
NEXT_PUBLIC_SENTRY_DSN  브라우저 오류 추적 DSN (선택)
```

Repository variable로 `NEXT_PUBLIC_CONTACT_EMAIL`도 필요합니다.

VM 이름, zone, Workload Identity provider, 배포 서비스 계정, 서버 SSH 호스트 키는 비밀값이 아니므로 `deploy.yml`의 `deploy` job `env`와 `Authenticate to Google Cloud` 단계에 직접 적혀 있습니다.

GitHub Actions는 `api`, `web` Docker 이미지를 GitHub Container Registry(GHCR)에 먼저 빌드/push합니다.
서버는 이미지를 pull한 뒤 `docker compose up -d --no-build`로 교체만 수행합니다.
따라서 e2-small 같은 작은 VM에서도 배포 중 서버가 직접 Next.js 빌드를 수행하지 않습니다.

### GCP 준비 (한 번만, Cloud Shell)

배포 전용 서비스 계정은 IAP 터널 접속과 VM 조회 권한만 가집니다.

```bash
PROJECT_ID=yakuku-yaru
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
REPO=Hansoo3366/yakuku-yaru
SA=github-deploy@$PROJECT_ID.iam.gserviceaccount.com

gcloud services enable iap.googleapis.com iamcredentials.googleapis.com sts.googleapis.com
gcloud iam service-accounts create github-deploy --display-name="GitHub Actions deploy"
gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/iap.tunnelResourceAccessor --condition=None
gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/compute.viewer --condition=None

gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc github-repo \
  --location=global --workload-identity-pool=github \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository=='$REPO' && assertion.ref=='refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding $SA --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

방화벽은 SSH를 IAP 대역에만 열고, 외부에는 80/443만 엽니다.

```bash
gcloud compute firewall-rules update default-allow-ssh --source-ranges=35.235.240.0/20
gcloud compute firewall-rules list --format="table(name,sourceRanges.list(),allowed[].map().firewall_rule().list(),targetTags.list())"
```

### 배포 키 만들기

서버에서 운영 계정으로 한 번만 실행합니다.

```bash
cd ~/yakuku-yaru
sudo bash scripts/deploy/setup-deploy-user.sh
```

스크립트가 하는 일:

1. 비밀번호 없이 공개키로만 접속하는 `deploy` 사용자를 만듭니다.
2. `scripts/deploy/yakuku-deploy`를 `/usr/local/bin/yakuku-deploy`에 root 소유로 복사하고, 운영 계정과 저장소 경로를 `/etc/yakuku-deploy.conf`에 적습니다.
3. `deploy`가 그 명령 하나만 운영 계정으로 실행할 수 있게 `/etc/sudoers.d/yakuku-deploy`를 만듭니다.
4. 새 키를 만들어 `restrict,command="/usr/local/bin/yakuku-deploy"`를 붙여 등록하고, `DEPLOY_SSH_KEY`에 넣을 private key를 출력한 뒤 서버에서 지웁니다.

**주의:** `.pub` 파일이 아니라 **private key**(`BEGIN OPENSSH PRIVATE KEY`)를 Secret에 넣습니다. Mac 등 다른 곳으로 복사하지 않습니다.

`scripts/deploy/yakuku-deploy`를 고치면 서버에 자동으로 반영되지 않습니다. 고친 커밋이 배포된 뒤 위 명령을 다시 실행하고 `DEPLOY_SSH_KEY`를 새 키로 바꿉니다.

`deploy`는 GCP 메타데이터가 관리하지 않는 사용자라, 브라우저 SSH를 써도 키가 지워지지 않습니다. GCP Console의 `SSH 키`에 배포 키를 등록하지 않습니다.

### 서버 접속

외부 IP로 직접 SSH 할 수 없으므로 아래 중 하나를 씁니다.

- GCP Console의 **브라우저 SSH**
- `gcloud compute ssh instance-20260521-045939 --zone us-central1-a --tunnel-through-iap`

### VM을 새로 만들었을 때

1. `deploy.yml`의 `GCP_INSTANCE`, `GCP_ZONE`을 새 값으로 바꿉니다.
2. 새 VM에서 `cat /etc/ssh/ssh_host_ed25519_key.pub` 값으로 `DEPLOY_HOST_KEY`를 바꿉니다.
3. 위 "배포 키 만들기"를 다시 하고 `DEPLOY_SSH_KEY`를 덮어씁니다.

수동으로 자동 배포를 테스트하려면 GitHub Actions 화면에서 `Deploy to Google Cloud VM` workflow의 `Run workflow`를 실행합니다.

### 배포 실패할 때

| 실패한 단계                                                         | 확인할 것                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Authenticate to Google Cloud`                                      | provider 경로, 서비스 계정의 `roles/iam.workloadIdentityUser` 바인딩, `main` 브랜치에서 돌았는지              |
| `Open IAP tunnel`                                                   | 서비스 계정의 `roles/iap.tunnelResourceAccessor`, 방화벽에 `35.235.240.0/20` → 22 허용이 있는지, VM 이름/zone |
| `Deploy with Docker Compose` 의 `Host key verification failed`      | VM을 새로 만들었으면 `DEPLOY_HOST_KEY` 교체                                                                   |
| `Deploy with Docker Compose` 의 `Permission denied (publickey)`     | `DEPLOY_SSH_KEY`와 서버 공개키 지문 비교, `DEPLOY_USER`가 `deploy`인지                                        |
| `Deploy with Docker Compose` 의 `허용되지 않은 명령입니다`          | workflow의 ssh 명령이 `deploy <SHA> <사용자>` 꼴인지                                                          |
| `Deploy with Docker Compose` 의 `sudo: a password is required`      | `/etc/sudoers.d/yakuku-deploy`가 있는지, `setup-deploy-user.sh`를 다시 실행                                   |
| `Deploy with Docker Compose` 의 `비정상 컨테이너` / `준비되지 않음` | 서버에서 `docker compose -f docker-compose.prod.yml logs --tail 80 api web`                                   |

키 지문 비교:

```bash
# 서버
sudo ssh-keygen -lf /home/deploy/.ssh/authorized_keys
# Secret 에 넣은 private key (Mac 등에서 임시로)
ssh-keygen -y -f key_file | ssh-keygen -lf -
```

- GCP VM에 **OS Login**이 켜져 있으면 `~/.ssh/authorized_keys`가 무시될 수 있습니다. 메타데이터에서 OS Login을 끄거나, OS Login용 키를 등록해야 합니다.

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

GitHub Actions 자동 배포는 항상 `--profile proxy`로 Caddy를 함께 실행합니다.

Google Cloud 방화벽에서는 `80`, `443`만 외부에 열고, SSH `22`는 IAP 대역(`35.235.240.0/20`)에만 엽니다.

애플리케이션 요청 제한은 대규모 회선 DDoS를 완전히 막지 못합니다. Cloudflare 프록시 또는 Google Cloud Load Balancer + Cloud Armor 구성과 원본 방화벽 제한은 [security.md](./security.md)를 참고합니다.

## 10-1. 운영 환경 변수

`.env.production`에는 최소 아래 값이 필요합니다.

```env
NODE_ENV=production
APP_URL=https://yakuku-yaru.today
APP_DOMAIN=yakuku-yaru.today
NEXT_PUBLIC_API_URL=https://yakuku-yaru.today/api

JWT_SECRET=replace-with-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_REMEMBER_EXPIRES_IN=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM="야크크 야르 <your-gmail@gmail.com>"

# 오류 추적 (아래 "오류 추적 (Sentry)" 참고). 비워 두면 메일 알림으로 대신한다.
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

### 오류 추적 (Sentry)

서버·브라우저에서 난 오류는 [Sentry](https://sentry.io) 로 모읍니다. DSN 이 없으면 추적이 꺼진 채로 동작하고, 그때는 production 에서 오류 메일 알림(`ERROR_ALERT_*`)이 대신 켜집니다.

1. Sentry 에서 프로젝트를 두 개 만듭니다: 플랫폼 **Node.js** (API) 하나, **Next.js** (웹) 하나. 각 프로젝트의 DSN 을 복사합니다.
2. 서버의 `.env.production` 에 추가합니다.

   ```env
   # API 오류 (Node.js 프로젝트 DSN)
   SENTRY_DSN=https://...@o0.ingest.sentry.io/0
   # 웹 오류 (Next.js 프로젝트 DSN). 서버 렌더링과 브라우저 양쪽에 쓰인다.
   NEXT_PUBLIC_SENTRY_DSN=https://...@o0.ingest.sentry.io/0
   SENTRY_ENVIRONMENT=production
   ```

3. 브라우저 쪽 DSN 은 빌드 때 번들에 들어가므로 GitHub repository secret 에도 `NEXT_PUBLIC_SENTRY_DSN` 을 같은 값으로 넣습니다. 배포 워크플로가 웹 이미지를 빌드할 때 이 값을 씁니다.
4. 다음 배포부터 적용됩니다. 릴리스 이름은 배포한 커밋의 sha(`SENTRY_RELEASE`)로 자동으로 붙습니다.

동작 방식:

- API: 500 응답, 처리되지 않은 예외, KBO 동기화 실패가 요청 경로·사용자 id 와 함께 올라갑니다. 브라우저가 이미지 요청을 중간에 취소한 경우(`ECONNABORTED`)는 오류가 아니므로 보내지 않습니다.
- 웹: 서버 컴포넌트·라우트 핸들러 오류와 브라우저 오류가 올라갑니다. 브라우저는 `sentry.io` 로 직접 보내지 않고 같은 도메인의 `/monitoring` 을 거치므로 CSP 를 바꾸지 않아도 됩니다.
- 요청 추적(tracing)과 세션 리플레이는 끄고 오류만 보냅니다. 소스맵은 올리지 않습니다.
- Sentry 를 쓰면서 메일 알림도 받고 싶으면 `ERROR_ALERT_ENABLED=true` 를 따로 켭니다.

`.env.production`만 수정했을 때는 Caddy만 재시작하면 안 되고, 해당 환경 변수를 사용하는 `api`와 `web` 컨테이너를 다시 올려야 합니다.

**가장 쉬운 방법은 배포 워크플로를 다시 돌리는 것입니다.** GitHub 의 Actions → "Deploy to Google Cloud VM" → Run workflow, 또는 로컬에서 `gh workflow run deploy.yml --ref main`. 바뀐 값을 읽어 `api`·`web` 컨테이너가 새로 만들어집니다.

서버에서 직접 올리려면 이미지 이름을 함께 넘겨야 합니다. 이미지는 Actions 에서 빌드해 `ghcr.io/<owner>/yakuku-yaru-{api,web}:<커밋 sha>` 로 올리고, compose 파일은 `API_IMAGE` / `WEB_IMAGE` 환경 변수로 그 이름을 받습니다. 빼먹으면 기본값 `yakuku-yaru-api:latest` 를 찾다가 `No such image` 로 실패합니다. (기존 컨테이너는 그대로 돌기 때문에 사이트가 멈추지는 않습니다.)

```bash
# 지금 돌고 있는 컨테이너의 이미지 이름을 그대로 다시 쓴다
export API_IMAGE=$(docker inspect -f '{{.Config.Image}}' yakuku-yaru-api-1)
export WEB_IMAGE=$(docker inspect -f '{{.Config.Image}}' yakuku-yaru-web-1)
docker compose --env-file .env.production -f docker-compose.prod.yml --profile proxy up -d --no-build api web
```

서버에서 `--build` 는 붙이지 않습니다.

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
