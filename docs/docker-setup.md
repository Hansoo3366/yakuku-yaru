# Docker Setup

Yakuku Yaru는 로컬 개발용 MySQL을 Docker Compose로 실행합니다.

## 1. Docker Desktop 설치

Mac 기준으로 Docker Desktop을 설치합니다.

공식 사이트:

```txt
https://www.docker.com/products/docker-desktop/
```

설치 후 Docker Desktop 앱을 실행합니다.

상단 메뉴바에 Docker 아이콘이 보이고, 상태가 `Docker Desktop is running`이면 준비된 상태입니다.

## 2. 환경 변수 파일 생성

프로젝트 루트에서 `.env.example`을 복사해 `.env`를 만듭니다.

```bash
cp .env.example .env
```

기본값으로 바로 실행할 수 있게 작성되어 있습니다.

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=yakuku_yaru
MYSQL_USER=yakuku
MYSQL_PASSWORD=yakuku_password
MYSQL_ROOT_PASSWORD=root_password
```

## 3. MySQL 컨테이너 실행

프로젝트 루트에서 실행합니다.

```bash
docker compose up -d mysql
```

처음 실행하면 `mysql:8.4` 이미지를 다운로드하느라 시간이 걸릴 수 있습니다.

## 4. 컨테이너 상태 확인

```bash
docker compose ps
```

`yakuku-yaru-mysql` 컨테이너 상태가 `running` 또는 `healthy`로 보이면 됩니다.

## 5. 로그 확인

```bash
docker compose logs mysql
```

초기 실행 시 `apps/api/db/init` 안의 SQL 파일이 자동 실행됩니다.

- `001_schema.sql`
- `002_seed_teams.sql`

이 과정에서 테이블 생성과 KBO 팀 seed 데이터가 들어갑니다.

## 6. MySQL 접속 확인

Docker 컨테이너 안의 MySQL에 접속합니다.

```bash
docker compose exec mysql mysql -u yakuku -pyakuku_password yakuku_yaru
```

접속 후 아래 SQL을 실행해 확인합니다.

```sql
SHOW TABLES;
SELECT * FROM teams;
```

종료는 다음 명령입니다.

```sql
exit;
```

## 7. API 서버 실행

MySQL이 켜진 상태에서 API 서버를 실행합니다.

```bash
npm run dev:api
```

## 8. Health Check

브라우저에서 아래 주소를 엽니다.

```txt
http://localhost:4000/api/health
```

정상이라면 아래처럼 응답합니다.

```json
{
  "status": "ok",
  "database": "ok",
  "service": "yakuku-yaru-api"
}
```

## 9. Swagger 확인

API 서버 실행 후 아래 주소에서 Swagger 문서를 볼 수 있습니다.

```txt
http://localhost:4000/api-docs
```

## 자주 나는 문제

### Cannot connect to the Docker daemon

Docker Desktop이 실행 중이 아닐 때 발생합니다.

해결:

- Docker Desktop 앱 실행
- 상태가 running이 될 때까지 기다리기
- 다시 `docker compose up -d mysql` 실행

### Port 3306 is already in use

이미 로컬 MySQL이 3306 포트를 사용 중일 때 발생합니다.

해결:

`.env`에서 포트를 바꿉니다.

```env
MYSQL_PORT=3307
```

그 후 다시 실행합니다.

```bash
docker compose up -d mysql
```

### 초기 SQL이 다시 실행되지 않음

MySQL volume이 이미 만들어진 뒤에는 `docker-entrypoint-initdb.d`의 SQL이 다시 실행되지 않습니다.

개발 중 DB를 완전히 초기화하려면 아래 명령을 사용합니다.

```bash
docker compose down -v
docker compose up -d mysql
```

주의: `-v`는 DB 데이터를 삭제합니다.
