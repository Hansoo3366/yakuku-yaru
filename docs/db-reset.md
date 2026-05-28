# DB 초기화

## 6월 등에 “가짜” 경기가 보일 때

초기 DB 시드(`003_seed_games.sql`)로 넣었던 **샘플 경기**는 `external_source`가 없습니다.  
`season` 동기화만 돌리면 **겹치지 않는 시드 row는 DB에 그대로** 남고, 예전에는 캘린더 API가 그것까지 보여줬습니다.

**지금:** 경기 목록 API는 `external_source = 'kbo'` 만 반환합니다 (배포 후).  
DB에서 완전히 지우려면:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T mysql \
  mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e \
  "DELETE FROM games WHERE external_source IS NULL OR external_source <> 'kbo';"
```

이후 `npm run db:reset-games` 또는 `sync:kbo-schedule -- --mode=season`.

---

## 경기만 비우고 KBO 전체 재적재 (라이브 · 사용자 유지)

**사용자·게시판·관리자는 그대로** 두고, 경기 일정만 지운 뒤 KBO `season` + `week` + `today` 동기화합니다.  
(경기 FK 때문에 **직관 기록·경기 알림**도 함께 삭제됩니다.)

```bash
cd ~/yakuku-yaru
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build api

docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api \
  sh -c 'cd apps/api && npm run db:reset-games'
```

동기화만 (경기 삭제 없이 upsert만):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api \
  sh -c 'cd apps/api && npm run sync:kbo-schedule -- --mode=season'
```

---

## 전체 초기화 + KBO 일정 재적재 (라이브)

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

KBO만 나중에 돌리려면: `SKIP_KBO_SYNC=true` 추가 후, 별도로 일정/선수/경기센터 동기화를 실행합니다.

```bash
npm run sync:kbo-schedule -- --mode=season
npm run sync:kbo-players
npm run sync:kbo-game-center -- --mode=today
```

### 로컬

```bash
cd apps/api
npm run build
ADMIN_EMAIL=admin@yakuku.local ADMIN_PASSWORD='Admin1234!' npm run db:reset-app
```

캘린더·메인 **팀 순위**는 DB에 순위 데이터가 있어야 합니다. 로컬에서 한 번:

```bash
cd apps/api
npm run sync:kbo-standings:dev
```

(`db:reset-app`만 하면 경기 일정은 들어가지만 순위는 비어 있을 수 있습니다.)

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
# 이후 db:reset-app 또는 KBO 동기화 실행
```

---

## 스크립트 요약

| 명령 | 경기 | 선수/라인업 | 사용자 등 | KBO sync |
|------|------|-------------|-----------|----------|
| `db:reset-app` | 삭제 | 재동기화 필요 | 삭제 + 관리자 생성 | season+week+today |
| `db:reset-users` | 유지 | 유지 | 삭제 + 관리자 생성 | 없음 |

운영 비밀번호는 반드시 `ADMIN_PASSWORD`로 지정하세요. 기본값 `Admin1234!`는 로컬용입니다.
