# KBO 경기 일정 동기화

## 데이터 소스

- **페이지**: [KBO 경기일정/결과](https://www.koreabaseball.com/Schedule/Schedule.aspx)
- **실제 API** (브라우저가 호출): `POST https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList`

KBO API는 **월 단위**만 제공합니다. 주·일 단위 갱신은 해당 월을 받아온 뒤 **KST 날짜로 필터**해 upsert합니다.

## 동기화 모드

| 모드 | 주기 | API 호출 범위 | DB 반영 범위 |
|------|------|---------------|--------------|
| `season` | **연 1회** (GHA) | 해당 연도 1~12월 전체 | 해당 월 전체 경기 |
| `month` | **월 1회** (GHA) | 이번 달 | 이번 달 전체 |
| `week` | **매일** (API cron + GHA 백업) | 전·당·다음 달 | KST 기준 **7일 전 ~ 14일 후** |
| `today` | **매시간** (API cron + GHA 백업) | 당월(월초 3일 이내면 전월 포함) | **오늘(KST)** 경기만 |

### 운영 분담

| 구간 | production API (`node-cron`) | GitHub Actions |
|------|------------------------------|----------------|
| 연간·월별 | — | `kbo-sync-season.yml`, `kbo-sync-month.yml` |
| 주간·당일 | `KBO_SYNC_WEEK_CRON`, `KBO_SYNC_TODAY_CRON` | `kbo-sync-week.yml`, `kbo-sync-today.yml` |

API 기동 약 20초 후 **주간(`week`)** 1회 추가 실행 (`KBO_SYNC_ON_START`).

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `KBO_SYNC_ENABLED` | `true` (production) | `false`면 API 자동 동기화 끔 |
| `KBO_SYNC_WEEK_CRON` | `0 6 * * *` | 주간 모드 (KST) |
| `KBO_SYNC_TODAY_CRON` | `0 * * * *` | 당일 모드 (KST) |
| `KBO_SYNC_ON_START` | `true` | 기동 직후 주간 1회 |
| `KBO_SYNC_START_DELAY_MS` | `20000` | 기동 후 대기(ms) |

하위 호환: `KBO_SYNC_CRON`은 `KBO_SYNC_WEEK_CRON`과 동일하게 취급합니다.

로컬 개발에서는 기본 **꺼짐** (`NODE_ENV !== production`). 켜려면 `KBO_SYNC_ENABLED=true`.

## 수동 실행

```bash
cd apps/api

# 기본: 주간 롤링
npm run sync:kbo-schedule

# 모드 지정
npm run sync:kbo-schedule -- --mode=season
npm run sync:kbo-schedule -- --mode=month
npm run sync:kbo-schedule -- --mode=week
npm run sync:kbo-schedule -- --mode=today

# 특정 연·월만 (레거시)
npm run sync:kbo-schedule -- --year=2026 --month=5
```

운영 Docker:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api \
  npm run sync:kbo-schedule -- --mode=today
```

## 파싱·DB

| 항목 | 규칙 |
|------|------|
| 경기 ID | `gameId` → `games.external_id` |
| upsert | `external_id` 우선, 없으면 `(game_date, home_team_id, away_team_id)` |
| `external_source` | `kbo` |

상세 파싱 규칙은 `apps/api/src/modules/kbo-schedule/parse-schedule.ts` 참고.

## 주의

- KBO/sports2i 이용약관·서버 부하를 준수하고, 요청 간격을 두세요.
- `season` 모드는 12회 월 API 호출이므로 연 1회만 사용하세요.
- HTML/API 구조 변경 시 `parse-schedule.ts` 수정이 필요할 수 있습니다.
