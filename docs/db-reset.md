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

## 라이브 (production · GCP SSH)

**주의: 되돌릴 수 없습니다. 백업 후 실행하세요.**

GCP SSH에서는 **호스트에서 `npm run` 하지 마세요.** 루트 `package.json`에 `db:reset-users`가 없어 `Missing script`가 납니다. **반드시 API 컨테이너 안**에서 실행합니다.

```bash
cd ~/yakuku-yaru   # 서버 DEPLOY_PATH

# 최신 코드·이미지 반영 (dist 스크립트 포함)
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api

# 사용자 데이터 비우기 + 관리자 1명 생성
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T \
  -e ADMIN_EMAIL='admin@yakuku-yaru.today' \
  -e ADMIN_PASSWORD='여기에-강한-비밀번호' \
  -e ADMIN_NICKNAME='관리자' \
  api sh -c 'cd apps/api && npm run db:reset-users'
```

`dist/scripts/`가 없으면(옛 이미지) 위 `node`로 직접 실행:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T \
  -e ADMIN_EMAIL='admin@yakuku-yaru.today' \
  -e ADMIN_PASSWORD='여기에-강한-비밀번호' \
  -e ADMIN_NICKNAME='관리자' \
  api node apps/api/dist/scripts/reset-users-and-seed-admin.js
```

경기 일정까지 전부 지우고 시드부터 다시 (극단적):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker volume rm <프로젝트>_mysql_data   # docker volume ls 로 확인
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
# init SQL 재적용 후 KBO 동기화·관리자 생성
```
