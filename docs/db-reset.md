# DB 초기화

## 전체 초기화 + KBO 일정 재적재 (권장 · 라이브)

**경기(가짜 시드 포함)·사용자·게시판·직관·알림을 모두 비우고**, 관리자 1명 생성 후 **KBO `season` → `week` → `today`** 동기화까지 한 번에 합니다.

`teams`, `stadium_guides` 마스터만 유지합니다.

**되돌릴 수 없습니다. 백업 후 실행하세요.**

### GCP SSH (production)

```bash
cd ~/yakuku-yaru

git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api

docker compose -f docker-compose.prod.yml --env-file .env.production exec -T \
  -e ADMIN_EMAIL='admin@yakuku-yaru.today' \
  -e ADMIN_PASSWORD='여기에-강한-비밀번호' \
  -e ADMIN_NICKNAME='관리자' \
  api sh -c 'cd apps/api && npm run db:reset-app'
```

KBO만 나중에 돌리려면: `SKIP_KBO_SYNC=true` 추가 후, 별도로 `npm run sync:kbo-schedule -- --mode=season`

### 로컬

```bash
cd apps/api
npm run build
ADMIN_EMAIL=admin@yakuku.local ADMIN_PASSWORD='Admin1234!' npm run db:reset-app
```

---

## 사용자만 초기화 (경기 일정 유지)

가입·게시판·직관·알림만 비웁니다. `games`는 그대로입니다.

```bash
# 로컬
cd apps/api && npm run db:reset-users

# 라이브
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T \
  -e ADMIN_EMAIL='admin@yakuku-yaru.today' \
  -e ADMIN_PASSWORD='여기에-강한-비밀번호' \
  -e ADMIN_NICKNAME='관리자' \
  api sh -c 'cd apps/api && npm run db:reset-users'
```

---

## SQL만 (수동)

```bash
# 앱 데이터 전체 (경기 포함)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T mysql \
  mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  < apps/api/db/scripts/clear-app-data.sql

# 사용자만
# apps/api/db/scripts/clear-user-data.sql
```

이후 관리자·KBO 동기화는 `db:reset-app` 또는 `sync:kbo-schedule -- --mode=season` 실행.

---

## MySQL 볼륨 완전 삭제 (극단적)

init SQL부터 전부 다시 (팀·구장 가이드 시드 포함):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker volume rm <프로젝트>_mysql_data   # docker volume ls 로 확인
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
# 이후 db:reset-app (경기 시드는 더 이상 없음)
```

---

## 스크립트 요약

| 명령 | 경기 | 사용자 등 | KBO sync |
|------|------|-----------|----------|
| `db:reset-app` | 삭제 | 삭제 + 관리자 생성 | season+week+today |
| `db:reset-users` | 유지 | 삭제 + 관리자 생성 | 없음 |

운영 비밀번호는 반드시 `ADMIN_PASSWORD`로 지정하세요. 기본값 `Admin1234!`는 로컬용입니다.
