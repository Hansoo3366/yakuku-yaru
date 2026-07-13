# KBO 파서 구조 변경 대응

## 증상

- sync 스크립트는 성공하지만 DB에 스코어·선발·라인업이 비어 있음
- 특정 날짜 경기만 누락
- 취소 사유 분류 오류

## 원인

KBO 웹사이트 HTML·ASMX 응답 필드명·gameId 부여 시점이 **사전 통지 없이 변경**됨.

## 해결 방안

### 1. 파서 수정

| 모듈 | 파일 |
|------|------|
| 일정 | `apps/api/src/modules/kbo-schedule/parse-schedule.ts` |
| 선수 | `apps/api/src/modules/kbo-players/parse-player-search.ts` |
| 경기센터 | `apps/api/src/modules/kbo-game-center/` |
| 순위 | `apps/api/src/modules/kbo-team-rank/` |

로컬에서 모드별 수동 실행 후 diff 확인:

```bash
npm run sync:kbo-schedule:dev -- --mode=today
```

### 2. upsert 키로 중복 방지

`external_id` 없는 pending 경기와 실제 gameId 경기가 **같은 row**로 합쳐지는지 확인.

### 3. seed fallback

동기화 실패 시 최소 일정·팀 데이터는 seed SQL로 앱 기동 가능.

### 4. 운영

- `logs/kbo-sync/` 로그 주기 확인
- 경기일 `today` cron 30분 간격으로 빠른 복구

## 아직 안 한 것

- sync 실패 시 Slack/이메일 알림
- 파서 단위 테스트 with fixture HTML

## 관련

- [[Decisions/KBO 크롤링 방식]]
- [[Features/KBO 데이터 동기화]]
