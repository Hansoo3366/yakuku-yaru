# KBO 데이터 동기화

## 데이터 소스

- **경기 일정/결과**: [KBO 경기일정/결과](https://www.koreabaseball.com/Schedule/Schedule.aspx)
- **경기 일정 실제 호출**: `POST https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList`
- **선수 목록**: [KBO 선수 조회](https://www.koreabaseball.com/Player/Search.aspx)
- **경기센터**: [KBO GameCenter](https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx)
- **순위**: KBO 팀 순위 페이지

KBO API는 **월 단위**만 제공합니다. 주·일 단위 갱신은 해당 월을 받아온 뒤 **KST 날짜로 필터**해 upsert합니다.

## 동기화 모드

| 모드 | 주기 | API 호출 범위 | DB 반영 범위 |
|------|------|---------------|--------------|
| `season` | **연 1회** | 해당 연도 1~12월 전체 | 해당 월 전체 경기 |
| `month` | **월 1회** | 이번 달 | 이번 달 전체 |
| `week` | **매일** | 전·당·다음 달 | KST 기준 **7일 전 ~ 14일 후** |
| `today` | **당일 8회** | 당월(월초 3일 이내면 전월 포함) | **오늘(KST)** 경기만 |

## 운영: 서버 호스트 cron (권장)

프로덕션 크롤은 **GitHub Actions 스케줄 없이** 서버 `crontab` + [`scripts/kbo-sync/`](../scripts/kbo-sync/README.md) 로 실행합니다.

| 스크립트 | 시각 (KST) | 내용 |
|----------|------------|------|
| `daily.sh` | 매일 **06:00** | `schedule week` → `standings` |
| `live.sh` | **08:00, 10:30~12:30, 13:00~23:30 매 30분** | `schedule today` → `game-center today` |
| `weekly.sh` | 매주 월 **06:30** | `sync:kbo-players` (선수 마스터, 프로필 이미지, 생년월일, 타격 지표) |
| `month.sh` | 매월 1일 **06:10** | `schedule month` |
| `season.sh` | 매년 3/1 **06:20** | `schedule season` |

설치 예:

```bash
cd ~/yakuku-yaru
git pull
chmod +x scripts/kbo-sync/*.sh
sed "s|PROJECT_DIR|$(pwd)|g" scripts/kbo-sync/crontab.example | crontab -
```

로그: `logs/kbo-sync/` · 동시 실행 방지: `flock` (`/tmp/yakuku-kbo-sync.lock`)

### API 컨테이너 내장 cron (기본 끔)

`docker-compose.prod.yml` 기본값 `KBO_SYNC_ENABLED=false` — 호스트 cron과 중복하지 않습니다.

**팀 순위**는 `daily.sh`와 `standings.sh`에서 갱신하고, 16~23시 KST에는 `live.sh`도 함께 갱신합니다.

`daily.sh`, `month.sh`, `season.sh`는 같은 lock 파일을 사용합니다. 매월 1일과 3월 1일에도 서로 건너뛰지 않도록 실행 시간을 06:00, 06:10, 06:20으로 분리합니다.

**경기센터** 동기화는 선발 투수, 선발 투수 스탯, 라인업을 저장합니다. 라인업은 당일에도 확정 전일 수 있어 데이터가 비어 있을 수 있습니다.

긴급히 API 프로세스 안에서만 돌리려면 `.env.production`에 `KBO_SYNC_ENABLED=true` (비권장).

| 변수 | 기본값 (prod compose) | 설명 |
|------|------------------------|------|
| `KBO_SYNC_ENABLED` | `false` | `true`면 API `node-cron` 사용 |
| `KBO_SYNC_WEEK_CRON` | `0 6 * * *` | 주간 모드 (KST) |
| `KBO_SYNC_TODAY_CRON` | `0 * * * *` | 당일 모드 (KST) |
| `KBO_SYNC_ON_START` | `false` | 기동 직후 week 1회 |

로컬 개발에서는 기본 **꺼짐** (`NODE_ENV !== production`). 켜려면 `KBO_SYNC_ENABLED=true`.

## 수동 실행 (서버)

```bash
cd ~/yakuku-yaru
./scripts/kbo-sync/daily.sh
./scripts/kbo-sync/live.sh
GC_MODE=week ./scripts/kbo-sync/live.sh
./scripts/kbo-sync/weekly.sh
./scripts/kbo-sync/season.sh
./scripts/kbo-sync/month.sh
```

Docker로 직접:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api \
  sh -c 'cd apps/api && npm run sync:kbo-schedule -- --mode=season'
```

로컬 개발 (`apps/api`):

```bash
npm run sync:kbo-schedule:dev -- --mode=week
npm run sync:kbo-players:dev
npm run sync:kbo-game-center:dev -- --mode=today
```

## GitHub Actions

KBO **스케줄** workflow는 제거했습니다. 배포만 `deploy.yml`을 사용합니다.

## 파싱·DB

| 항목 | 규칙 |
|------|------|
| 경기 ID | KBO `gameId` → `external_id`. **미래 일정**은 API에 `gameId`가 없을 수 있어 `pending-YYYYMMDDhhmm-원정-홈` 으로 저장 |
| upsert | `external_id` 우선, 없으면 `(game_date, home_team_id, away_team_id)` — 나중에 실제 `gameId`가 생기면 같은 경기로 **갱신** |
| `external_source` | `kbo` |
| 취소 사유 | KBO 상태 문구를 `rain`, `dust`, `ground`, `heat`, `cold`, `other`로 분류 |
| 선수 | `players.kbo_player_id` 기준 upsert |
| 선발 투수 | `(game_id, team_id)` 기준 upsert |
| 라인업 | `(game_id, team_id, batting_order)` 기준 upsert |

상세 파싱 규칙은 아래 파일을 참고합니다.

- `apps/api/src/modules/kbo-schedule/parse-schedule.ts`
- `apps/api/src/modules/kbo-players/parse-player-search.ts`
- `apps/api/src/modules/kbo-game-center/`
- `apps/api/src/modules/kbo-team-rank/`

## 화면 반영

- 캘린더: 시간, 팀, 스코어, 취소 사유, 선발 투수
- 경기 상세: 선발 투수 프로필, ERA, WHIP, WAR, QS, 라인업
- 홈/마이페이지: 내 팀 경기와 직관 인사이트
- 관리자: 경기 데이터 점검과 수동 수정

## 주의

- KBO/sports2i 이용약관·서버 부하를 준수하고, 요청 간격을 두세요.
- `season` 모드는 12회 월 API 호출이므로 연 1회만 사용하세요.
- HTML/API 구조 변경 시 파서 수정이 필요할 수 있습니다.
