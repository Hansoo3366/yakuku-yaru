# DB 초기화 (사용자 데이터)

`teams`, `games`, `stadium_guides` 등 **일정·팀 마스터는 유지**하고, 가입·게시판·직관·알림만 비웁니다.

## 로컬 (Docker MySQL)

```bash
# MySQL 컨테이너 실행 중일 때
cd apps/api
npm run db:reset-users
```

기본 관리자 (환경 변수 없을 때):

| 항목 | 값 |
|------|-----|
| 이메일 | `admin@yakuku.local` |
| 비밀번호 | `Admin1234!` |
| 닉네임 | `관리자` |

커스텀:

```bash
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD='your-secure-password' \
ADMIN_NICKNAME='운영자' \
npm run db:reset-users
```

SQL만 실행하려면:

```bash
docker exec -i yakuku-yaru-mysql mysql -uyakuku -pyakuku_password yakuku_yaru \
  < apps/api/db/scripts/clear-user-data.sql
# 이후 관리자는 npm run db:reset-users 또는 직접 INSERT
```

로컬 DB **완전 초기화** (볼륨 삭제 → init SQL부터 다시):

```bash
docker compose down
docker volume rm yakuku-yaru_mysql_data   # 볼륨 이름은 docker volume ls 로 확인
docker compose up -d
cd apps/api && npm run db:reset-users
```

## 라이브 (production)

**주의: 되돌릴 수 없습니다. 백업 후 실행하세요.**

```bash
cd /path/to/yakuku-yaru   # 서버의 DEPLOY_PATH

# 1) 사용자 관련 데이터만 비우기
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T mysql \
  mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  < apps/api/db/scripts/clear-user-data.sql

# 2) 관리자 1계정 생성 (비밀번호는 반드시 직접 지정)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api \
  env ADMIN_EMAIL='admin@yakuku-yaru.today' \
      ADMIN_PASSWORD='여기에-강한-비밀번호' \
      ADMIN_NICKNAME='관리자' \
  npm run db:reset-users
```

`db:reset-users`는 1번 truncate를 다시 하므로, **라이브에서는 아래 한 줄만** 써도 됩니다.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api \
  env ADMIN_EMAIL='admin@yakuku-yaru.today' \
      ADMIN_PASSWORD='여기에-강한-비밀번호' \
      ADMIN_NICKNAME='관리자' \
  npm run db:reset-users
```

경기 일정까지 전부 지우고 시드부터 다시 (극단적):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker volume rm <프로젝트>_mysql_data   # docker volume ls 로 확인
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
# init SQL 재적용 후 KBO 동기화·관리자 생성
```
