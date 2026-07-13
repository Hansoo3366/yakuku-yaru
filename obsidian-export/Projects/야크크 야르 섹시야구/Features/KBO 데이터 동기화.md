# KBO 데이터 동기화

## 데이터 소스

| 데이터 | 소스 |
|--------|------|
| 일정/결과 | `POST .../Schedule.asmx/GetScheduleList` |
| 선수 | KBO 선수 조회 페이지 |
| 선발/라인업 | GameCenter |
| 순위 | 팀 순위 페이지 |

## 스크립트 (npm)

```bash
# 로컬
npm run sync:kbo-schedule:dev -- --mode=week
npm run sync:kbo-players:dev
npm run sync:kbo-game-center:dev -- --mode=today

# 운영 (서버)
./scripts/kbo-sync/week.sh
./scripts/kbo-sync/today.sh
./scripts/kbo-sync/game-center.sh
```

## DB 반영

| 엔티티 | upsert 키 |
|--------|-----------|
| games | `external_id` → `(game_date, home, away)` |
| players | `kbo_player_id` |
| starting_pitchers | `(game_id, team_id)` |
| lineups | `(game_id, team_id, batting_order)` |

## 취소 사유 매핑

KBO 상태 문구 → `rain`, `dust`, `ground`, `heat`, `cold`, `other`

## 화면 반영

- **캘린더**: 시간, 스코어, 취소 아이콘, 선발 투수
- **경기 상세**: ERA/WHIP/WAR/QS, 라인업
- **홈/마이**: 내 팀 다음 경기, 순위

## 운영 cron (KST 요약)

- 매일 06:00 week 일정
- 경기일 30분 간격 today
- 월요일 07:10 선수
- `flock`으로 중복 실행 방지

## 관련

- [[Decisions/KBO 크롤링 방식]]
- [[Issues/KBO 파서 구조 변경 대응]]
- [[05 배포 및 운영#KBO 동기화 운영]]
