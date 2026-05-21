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

## 9. 데이터 보존

MySQL 데이터와 업로드 파일은 Docker volume에 저장됩니다.

- `mysql_data`
- `api_uploads`

컨테이너를 재빌드해도 volume은 유지됩니다.

주의:

```bash
docker compose -f docker-compose.prod.yml down -v
```

위 명령은 DB와 업로드 파일 volume을 삭제합니다.

## 10. 다음 개선

실서비스 수준으로 올릴 때는 아래 구성을 추가하는 것이 좋습니다.

- Nginx reverse proxy
- HTTPS 인증서
- 도메인 연결
- MySQL managed DB 또는 별도 DB 서버
- 업로드 파일 object storage
- GitHub Actions 자동 배포
