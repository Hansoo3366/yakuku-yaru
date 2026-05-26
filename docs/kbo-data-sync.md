# KBO 경기 일정 동기화

## 데이터 소스

- **페이지**: [KBO 경기일정/결과](https://www.koreabaseball.com/Schedule/Schedule.aspx)
- **실제 API** (브라우저가 호출): `POST https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList`

### 요청 파라미터

| 필드 | 설명 | 예시 |
|------|------|------|
| `leId` | 리그 ID | `1` |
| `srIdList` | 시리즈 (시범·정규·포스트) | `0,9,6` |
| `seasonId` | 시즌 연도 | `2026` |
| `gameMonth` | 월 (2자리) | `05` |
| `teamId` | 팀 필터 (전체는 빈 문자열) | `` |

응답은 `#tblScheduleList`와 동일한 행·셀 구조의 JSON (`rows[].row[].Text`에 HTML 포함)입니다.

## 파싱 규칙

| 항목 | 규칙 |
|------|------|
| 경기 ID | `gameId=20260501NCLG0` → `games.external_id` |
| 날짜 | `05.01(금)` + 시즌 연도 → `2026-05-01` |
| 시간 | `17:00` |
| 원정·홈 | `td.play` 첫 번째·두 번째 `<span>` (KBO 표기 순서) |
| 스코어 | `<em>` 안 `win`/`lose`/`same` 숫자, 없으면 `scheduled` |
| 구장 | 구장 열 약칭 → `kbo-stadium-map.ts` |
| 상태 | 비고 `우천취소` → `cancelled`, 리뷰/스코어 있음 → `finished`, 그 외 `scheduled` |

## DB

- `games.external_source` = `kbo`
- `games.external_id` = KBO `gameId`
- upsert: `external_id` 우선, 없으면 `(game_date, home_team_id, away_team_id)`

## 자동 동기화 (기본)

**production** API가 떠 있으면 별도 작업 없이 돌아갑니다.

| 시점 | 동작 |
|------|------|
| API 기동 ~20초 후 | 이번 달 + 다음 달 1회 동기화 |
| 매일 06:00 (KST) | 같은 범위 자동 동기화 |

환경 변수 (`docker-compose.prod.yml` / `.env.production`):

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `KBO_SYNC_ENABLED` | `true` (production) | `false`면 자동·시작 시 동기화 끔 |
| `KBO_SYNC_CRON` | `0 6 * * *` | node-cron 표현식 (KST) |
| `KBO_SYNC_ON_START` | `true` | 기동 직후 1회 실행 |
| `KBO_SYNC_START_DELAY_MS` | `20000` | 기동 후 대기(ms) |

로컬 개발에서는 기본 **꺼짐** (`NODE_ENV !== production`). 켜려면 `KBO_SYNC_ENABLED=true`.

백업: GitHub Actions [kbo-schedule-sync.yml](../.github/workflows/kbo-schedule-sync.yml)가 매일 VM에서 `npm run sync:kbo-schedule` 실행 (배포 secrets 필요).

## 수동 실행

```bash
cd apps/api

# 이번 달 + 다음 달 (자동과 동일)
npm run sync:kbo-schedule

# 특정 연·월만
npm run sync:kbo-schedule -- --year=2026 --month=5
```

운영 Docker:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api \
  npm run sync:kbo-schedule
```

## 갱신 범위

- **롤링 윈도우**: KST 기준 **이번 달 + 다음 달** (12월이면 12월·다음 해 1월)
- 실시간 중계·선발·선수 스탯은 포함하지 않음

## 주의

- KBO/sports2i 데이터 이용약관·서버 부하를 준수하고, 요청 간격을 두세요.
- HTML 구조나 API가 바뀌면 `parse-schedule.ts` 수정이 필요할 수 있습니다.
