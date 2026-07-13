# KBO 크롤링 방식

## 결정

KBO **공식 공개 REST API가 없으므로**, 웹 페이지와 브라우저가 호출하는 엔드포인트(`Schedule.asmx/GetScheduleList` 등)를 **파싱·upsert**한다.

## 배경

- 캘린더·경기 상세의 핵심 가치가 KBO 일정/스코어/선발/라인업
- 사용자가 스코어를 수동 입력하면 데이터 신뢰도·UX 모두 나빠짐
- sports2i 등 유료/제한 API는 학습 범위 밖

## 동기화 전략

| 모드 | 용도 |
|------|------|
| `season` | 시즌 시작 전 전체 일정 (연 1회) |
| `month` | 월간 일정 보정 (월 1회) |
| `week` | ±7~14일 일정 (매일) |
| `today` | 당일 스코어·상태 (경기일 30분 간격) |

- API는 **월 단위**만 제공 → 받은 뒤 KST로 필터
- 운영: 서버 호스트 **crontab** + `flock` (API 내장 cron 기본 OFF)

## 경기 ID 처리

```
미래 일정 (gameId 없음) → pending-YYYYMMDDhhmm-원정-홈
실제 gameId 수신       → external_id로 동일 경기 갱신
fallback unique        → (game_date, home_team_id, away_team_id)
```

## 트레이드오프

| 장점 | 단점 |
|------|------|
| 비용 없음, 풍부한 데이터 | HTML/API 변경 시 파서 수정 |
| 과제에서 ETL 경험 | 이용약관·부하 준수 필요 |
| seed fallback 가능 | 실시간 보장 불가 |

## 관련

- [[KBO 데이터 동기화]]
- [[KBO 파서 구조 변경 대응]]
- [[공식 스코어 사용자 수정 불가]]
