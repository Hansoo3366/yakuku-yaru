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

초기 테스트 배포는 서버 IP와 포트로 접근할 수 있습니다.

```txt
http://SERVER_IP:3000       Web
http://SERVER_IP:4000/api   API
http://SERVER_IP:4000/api-docs Swagger
```

현재 제출용 배포는 도메인과 HTTPS를 기준으로 합니다.

```txt
https://yakuku-yaru.today          Web
https://yakuku-yaru.today/api      API
https://yakuku-yaru.today/api-docs Swagger
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
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000/api
APP_DOMAIN=YOUR_DOMAIN
JWT_SECRET=replace-with-a-long-random-secret
MYSQL_PASSWORD=replace-with-strong-password
MYSQL_ROOT_PASSWORD=replace-with-strong-root-password
```

도메인을 연결한 뒤에는 `NEXT_PUBLIC_API_URL`을 도메인 기준으로 바꿉니다.

```env
NEXT_PUBLIC_API_URL=https://yakuku-yaru.today/api
APP_DOMAIN=yakuku-yaru.today
```

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
http://SERVER_IP:3000
http://SERVER_IP:4000/api/health
http://SERVER_IP:4000/api-docs
```

도메인 연결 후에는 아래 주소를 확인합니다.

```txt
https://yakuku-yaru.today
https://yakuku-yaru.today/api/health
https://yakuku-yaru.today/api-docs
https://yakuku-yaru.today/uploads/<uploaded-file-name>
```

## 8. 업데이트 배포

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
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
```

예시:

```txt
DEPLOY_HOST=34.000.000.000
DEPLOY_USER=hanso3366
DEPLOY_PATH=/home/hanso3366/yakuku-yaru
DEPLOY_PORT=22
DEPLOY_COMPOSE_PROFILES=proxy
```

`DEPLOY_SSH_KEY`는 GitHub가 서버에 접속할 때 사용할 private key입니다. 서버에서 배포용 key를 새로 만들고 공개키를 `~/.ssh/authorized_keys`에 추가한 뒤, private key 내용을 GitHub Secret에 넣는 방식을 권장합니다.

```bash
ssh-keygen -t ed25519 -C "github-actions-yakuku-yaru" -f ~/.ssh/github_actions_yakuku_yaru
cat ~/.ssh/github_actions_yakuku_yaru.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_yakuku_yaru
```

마지막 명령으로 출력된 private key 전체를 `DEPLOY_SSH_KEY`에 저장합니다.

수동으로 자동 배포를 테스트하려면 GitHub Actions 화면에서 `Deploy to Google Cloud VM` workflow의 `Run workflow`를 실행합니다.

### SSH 인증 실패 (`unable to authenticate, attempted methods [none publickey]`)

KBO 크롤 workflow가 아니라 **`Deploy to Google Cloud VM`** 배포 단계에서 나는 오류입니다. GitHub Secrets의 `DEPLOY_SSH_KEY`와 서버 `authorized_keys`가 맞지 않을 때 발생합니다.

1. **서버에서** 배포 전용 키를 새로 만듭니다 (패스프레이즈 없이).

```bash
ssh-keygen -t ed25519 -C "github-actions-yakuku-yaru" -f ~/.ssh/github_actions_yakuku_yaru -N ""
chmod 600 ~/.ssh/github_actions_yakuku_yaru
chmod 644 ~/.ssh/github_actions_yakuku_yaru.pub
cat ~/.ssh/github_actions_yakuku_yaru.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

2. **로컬에서** 같은 키로 접속되는지 확인합니다.

```bash
ssh -i ~/.ssh/github_actions_yakuku_yaru -p 22 DEPLOY_USER@DEPLOY_HOST "echo ok"
```

3. GitHub → **Settings → Secrets and variables → Actions** 에서 `DEPLOY_SSH_KEY`를 **전체 교체**합니다.
   - `-----BEGIN OPENSSH PRIVATE KEY-----` 부터 `-----END ...-----` 까지 한 글자도 빠지지 않게
   - 앞뒤 공백·따옴표 없이
   - 예전에 쓰던 **다른 PC 키·패스프레이즈 있는 키**는 Actions에서 사용 불가

4. `DEPLOY_USER`가 서버 로그인 계정과 같은지, `DEPLOY_HOST`가 **외부 IP**인지 확인합니다.

5. 다시 Actions에서 `Deploy to Google Cloud VM` → **Run workflow** 실행.

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
docker compose --env-file .env.production -f docker-compose.prod.yml --profile proxy up -d --build
```

Caddy는 `APP_DOMAIN` 기준으로 Let's Encrypt 인증서를 자동 발급하고 갱신합니다.

GitHub Actions 자동 배포에서도 Caddy를 함께 실행하려면 repository secret에 아래 값을 추가합니다.

```txt
DEPLOY_COMPOSE_PROFILES=proxy
```

도메인 HTTPS 접속이 확인되면 Google Cloud 방화벽에서 `3000`, `4000` 포트는 닫고 `80`, `443`만 외부에 열어두는 것을 권장합니다.

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

## 12. 다음 개선

실서비스 수준으로 올릴 때는 아래 구성을 추가하는 것이 좋습니다.

- MySQL managed DB 또는 별도 DB 서버
- 업로드 파일 object storage
- Blue-green 배포
