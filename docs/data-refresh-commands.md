# 데이터 갱신 명령어 총정리

이 문서는 Yakuku Yaru의 데이터 동기화/갱신 명령어를 **실행 환경별**로 정리합니다.

## 1) 로컬 개발 환경 (npm 사용 가능)

프로젝트 루트에서 실행:

```bash
# API dev 서버 (마이그레이션 포함)
npm run dev:api

# 경기 일정/결과 동기화
npm run sync:kbo-schedule:dev --workspace @yakuku-yaru/api -- --mode=today
npm run sync:kbo-schedule:dev --workspace @yakuku-yaru/api -- --mode=week
npm run sync:kbo-schedule:dev --workspace @yakuku-yaru/api -- --mode=month
npm run sync:kbo-schedule:dev --workspace @yakuku-yaru/api -- --mode=season

# 팀 순위 동기화 (최근 10경기, 연속 포함)
npm run sync:kbo-standings:dev --workspace @yakuku-yaru/api

# 선수 마스터 동기화
npm run sync:kbo-players:dev --workspace @yakuku-yaru/api

# 게임센터 동기화 (선발/라인업/확정 여부)
npm run sync:kbo-game-center:dev --workspace @yakuku-yaru/api -- --mode=today
npm run sync:kbo-game-center:dev --workspace @yakuku-yaru/api -- --mode=week
```

## 2) 서버 운영 환경 (호스트에 npm 없음, Docker Compose 기반)

프로젝트 루트(`~/yakuku-yaru`)에서 실행:

```bash
# 권장: 래퍼 스크립트 사용
./scripts/kbo-sync/daily.sh      # week 일정 + 순위
./scripts/kbo-sync/live.sh       # today 일정 + 게임센터
./scripts/kbo-sync/standings.sh  # 순위만
./scripts/kbo-sync/weekly.sh     # 선수
./scripts/kbo-sync/month.sh      # month 일정
./scripts/kbo-sync/season.sh     # season 일정
```

직접 컨테이너 실행(동일 동작):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api \
  sh -c "cd apps/api && npm run sync:kbo-standings"
```

## 3) 실무에서 자주 쓰는 갱신 조합

### A. 순위만 즉시 갱신
```bash
./scripts/kbo-sync/standings.sh
```

### B. 오늘 경기/라인업 + 순위까지 즉시 갱신
```bash
./scripts/kbo-sync/live.sh
./scripts/kbo-sync/standings.sh
```

### C. 전체 상태 점검용(일일 배치와 동일)
```bash
./scripts/kbo-sync/daily.sh
```

## 4) 로그 확인

```bash
tail -f logs/kbo-sync/$(ls -t logs/kbo-sync/ | head -1)
```

## 5) 트러블슈팅

### `npm: command not found` (서버)
- 정상입니다. 서버는 호스트 npm 대신 `docker compose exec api`로 실행해야 합니다.
- 즉, `scripts/kbo-sync/*.sh` 사용이 정석입니다.

### `api` 컨테이너가 없거나 정지 상태
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
```

### 순위가 안 바뀜
1. `./scripts/kbo-sync/standings.sh` 실행
2. API 응답 `/teams/standings`에 `recentTen`, `streak` 값 확인
3. 프론트 새로고침

