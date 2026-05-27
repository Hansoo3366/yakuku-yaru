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
| 팀 순위(일자별) | — | `kbo-sync-standings.yml` (매일) |
| 선수 마스터 | — | `kbo-sync-players.yml` (매주 월 06:30 KST) |
| 선발·라인업 | — | `kbo-sync-game-center.yml` (당일 8회, KST 시간대) |

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

# 팀 순위 (KBO 일자별 순위 페이지 HTML 파싱)
npm run sync:kbo-standings

# 선수 마스터 (10개 구단 전체)
npm run sync:kbo-players

# 당일 선발 투수·라인업 (기본 today)
npm run sync:kbo-game-center
npm run sync:kbo-game-center -- --mode=week
```

### GitHub Actions 스케줄 (KST)

| 워크플로 | 시각 |
|----------|------|
| `kbo-sync-players.yml` | **매주 월요일 06:30** |
| `kbo-sync-game-center.yml` | **매일** 08:00, 10:30, 13:00, 15:30, 17:00, 18:30, 20:00, 21:30 |

`game-center`는 Actions 탭에서 `workflow_dispatch`로 `today` / `week` / `month` 수동 실행 가능.
```

운영 Docker (GCP SSH, API 컨테이너 안):

```bash
cd ~/yakuku-yaru
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api \
  sh -c 'cd apps/api && npm run sync:kbo-schedule -- --mode=season'
```

## 파싱·DB

| 항목 | 규칙 |
|------|------|
| 경기 ID | KBO `gameId` → `external_id`. **미래 일정**은 API에 `gameId`가 없을 수 있어 `pending-YYYYMMDDhhmm-원정-홈` 으로 저장 |
| upsert | `external_id` 우선, 없으면 `(game_date, home_team_id, away_team_id)` — 나중에 실제 `gameId`가 생기면 같은 경기로 **갱신** |
| `external_source` | `kbo` |

미래 달(6·7·8월 등)도 KBO API에 **시간·대진·구장**은 오지만 `gameId` 링크만 비어 있는 경우가 많습니다. 예전 파서는 `gameId` 없으면 행 전체를 버려서 “일정 없음”처럼 보였습니다.

상세 파싱 규칙은 `apps/api/src/modules/kbo-schedule/parse-schedule.ts` 참고.

## 주의

- KBO/sports2i 이용약관·서버 부하를 준수하고, 요청 간격을 두세요.
- `season` 모드는 12회 월 API 호출이므로 연 1회만 사용하세요.
- HTML/API 구조 변경 시 `parse-schedule.ts` 수정이 필요할 수 있습니다.
