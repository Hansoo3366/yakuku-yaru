# KBO 서버 크롤링 (cron)

GitHub Actions 스케줄 대신 **프로덕션 서버 호스트 crontab**에서 실행합니다.  
실제 크롤은 `docker compose exec api` 안에서 `apps/api`의 npm 스크립트가 수행합니다.

## 스크립트

| 파일 | 내용 |
|------|------|
| `daily.sh` | `sync:kbo-schedule --mode=week` → `sync:kbo-standings` |
| `live.sh` | `sync:kbo-schedule --mode=today` → `sync:kbo-game-center` (선발·라인업·공식 여부) |
| `weekly.sh` | `sync:kbo-players` |
| `season.sh` | `sync:kbo-schedule --mode=season` |
| `month.sh` | `sync:kbo-schedule --mode=month` |

로그: `logs/kbo-sync/` (프로젝트 루트)

진행 상황은 API 스크립트가 **stderr**에 팀/월/경기 단위로 출력합니다 (`[kbo-players]`, `[kbo-game-center]` 등).  
`weekly.sh`는 팀당 1~3분 걸릴 수 있어, 끝나기 전까지 마지막 `[kbo-players] N/10 …` 줄이 갱신되면 정상 실행 중입니다.

```bash
tail -f logs/kbo-sync/$(ls -t logs/kbo-sync/ | head -1)
```

동시 실행 방지: `/tmp/yakuku-kbo-sync.lock` (flock)

## 서버 설치 (cron — `live.sh` 자동 갱신 포함)

`crontab.example`에 **live.sh가 경기일 하루 8회**(08:00~21:30 KST) 등록되어 있습니다.  
일정·순위·선수·시즌 일정도 함께 들어 있습니다.

```bash
cd ~/yakuku-yaru
git pull
chmod +x scripts/kbo-sync/*.sh

# 등록 (PROJECT_DIR 자동 치환)
sed "s|PROJECT_DIR|$(pwd)|g" scripts/kbo-sync/crontab.example | crontab -

# 확인 — live.sh 줄이 보여야 함
crontab -l
```

이미 crontab이 있으면 **덮어쓰기 전** `crontab -l > ~/crontab.backup` 으로 백업하세요.

GCP VM이 UTC여도 `TZ=Asia/Seoul` 이라 주석의 KST 시각 그대로 동작합니다.

| KST | 스크립트 |
|-----|----------|
| 06:00 매일 | `daily.sh` |
| 08:00, 10:30, 13:00, 15:30, 17:00, 18:30, 20:00, 21:30 | **`live.sh`** |
| 월 06:30 | `weekly.sh` |
| 매월 1일 06:00 | `month.sh` |
| 3/1 06:00 | `season.sh` |

동시에 두 배치가 겹치면 flock 때문에 하나는 “건너뜀”으로 끝납니다 (`weekly` 길 때 `live`가 스킵될 수 있음).

수동 실행:

```bash
./scripts/kbo-sync/daily.sh
./scripts/kbo-sync/live.sh
GC_MODE=week ./scripts/kbo-sync/live.sh   # game-center만 week
```

## API 컨테이너 내장 cron

`docker-compose.prod.yml` 기본값 `KBO_SYNC_ENABLED=false` — 호스트 cron과 **중복하지 않음**.

긴급히 API 안에서만 돌리려면 `.env.production`에 `KBO_SYNC_ENABLED=true` (비권장).

## GitHub Actions

KBO **스케줄** workflow는 제거했습니다. 배포는 `deploy.yml`만 사용합니다.  
원격 수동 실행이 필요하면 서버에서 위 스크립트를 실행하세요.
