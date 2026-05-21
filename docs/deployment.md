# Deployment

이 문서는 Cloud Server 한 대에서 Docker Compose로 Yakuku Yaru를 배포하는 방법입니다.

## 배포 구조

```txt
Cloud Server
  ├─ web    Next.js production server
  ├─ api    Express API server
  └─ mysql  MySQL 8.4
```

초기 과제 제출용 배포는 서버 IP와 포트로 접근하는 방식을 기준으로 합니다.

```txt
http://SERVER_IP:3000       Web
http://SERVER_IP:4000/api   API
http://SERVER_IP:4000/api-docs Swagger
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
JWT_SECRET=replace-with-a-long-random-secret
MYSQL_PASSWORD=replace-with-strong-password
MYSQL_ROOT_PASSWORD=replace-with-strong-root-password
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
```

예시:

```txt
DEPLOY_HOST=34.000.000.000
DEPLOY_USER=hanso3366
DEPLOY_PATH=/home/hanso3366/yakuku-yaru
DEPLOY_PORT=22
```

`DEPLOY_SSH_KEY`는 GitHub가 서버에 접속할 때 사용할 private key입니다. 서버에서 배포용 key를 새로 만들고 공개키를 `~/.ssh/authorized_keys`에 추가한 뒤, private key 내용을 GitHub Secret에 넣는 방식을 권장합니다.

```bash
ssh-keygen -t ed25519 -C "github-actions-yakuku-yaru" -f ~/.ssh/github_actions_yakuku_yaru
cat ~/.ssh/github_actions_yakuku_yaru.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_yakuku_yaru
```

마지막 명령으로 출력된 private key 전체를 `DEPLOY_SSH_KEY`에 저장합니다.

수동으로 자동 배포를 테스트하려면 GitHub Actions 화면에서 `Deploy to Google Cloud VM` workflow의 `Run workflow`를 실행합니다.

## 10. 데이터 보존

MySQL 데이터와 업로드 파일은 Docker volume에 저장됩니다.

- `mysql_data`
- `api_uploads`

컨테이너를 재빌드해도 volume은 유지됩니다.

주의:

```bash
docker compose -f docker-compose.prod.yml down -v
```

위 명령은 DB와 업로드 파일 volume을 삭제합니다.

## 11. 다음 개선

실서비스 수준으로 올릴 때는 아래 구성을 추가하는 것이 좋습니다.

- Nginx reverse proxy
- HTTPS 인증서
- 도메인 연결
- MySQL managed DB 또는 별도 DB 서버
- 업로드 파일 object storage
- GitHub Actions 자동 배포
