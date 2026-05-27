# KBO 서버 크롤링 (cron)

GitHub Actions 스케줄 대신 **프로덕션 서버 호스트 crontab**에서 실행합니다.  
실제 크롤은 `docker compose exec api` 안의 npm 스크립트가 수행합니다.

## 스크립트

| 파일 | 내용 |
|------|------|
| `daily.sh` | `sync:kbo-schedule --mode=week` → `sync:kbo-standings` |
| `live.sh` | `sync:kbo-schedule --mode=today` → `sync:kbo-game-center` (기본 `today`) |
| `weekly.sh` | `sync:kbo-players` |
| `season.sh` | `sync:kbo-schedule --mode=season` |
| `month.sh` | `sync:kbo-schedule --mode=month` |

로그: `logs/kbo-sync/` (프로젝트 루트)

동시 실행 방지: `/tmp/yakuku-kbo-sync.lock` (flock)

## 서버 설치

```bash
cd ~/yakuku-yaru
git pull
chmod +x scripts/kbo-sync/*.sh

# crontab 예시 복사 후 PROJECT_DIR 치환
sed "s|PROJECT_DIR|$(pwd)|g" scripts/kbo-sync/crontab.example | crontab -
crontab -l
```

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
