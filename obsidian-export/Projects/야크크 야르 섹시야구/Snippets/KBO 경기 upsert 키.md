# KBO 경기 upsert 키

**위치**: `apps/api/src/modules/kbo-schedule/` (parse + repository)

## 규칙

```
1. external_id (KBO gameId) 가 있으면 → 이 키로 upsert
2. 없으면 (미래 일정) → pending-YYYYMMDDhhmm-원정-홈 임시 ID
3. fallback unique → (game_date, home_team_id, away_team_id)
4. 나중에 실제 gameId 수신 시 → 같은 경기 row 갱신 (중복 방지)
```

## 왜 필요한가

KBO 일정 API는 **월 단위**이고, **미래 경기에는 gameId가 없을 수 있음**. 임시 ID 없이 insert하면 같은 경기가 두 row로 쪼개질 수 있다.

## 관련

- [[Decisions/KBO 크롤링 방식]]
- [[Features/KBO 데이터 동기화]]
- [[Issues/KBO 파서 구조 변경 대응]]
