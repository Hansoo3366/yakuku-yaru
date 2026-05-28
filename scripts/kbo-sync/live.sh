#!/usr/bin/env bash
BATCH_NAME=live
# shellcheck source=common.sh
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

GC_MODE="${GC_MODE:-today}"

run_in_api "npm run sync:kbo-schedule -- --mode=today"
run_in_api "npm run sync:kbo-game-center -- --mode=${GC_MODE}"

# 경기 종료 무렵(21~23시 KST) 팀 순위도 함께 갱신
KST_HOUR="$(TZ=Asia/Seoul date +%H)"
if [[ "$KST_HOUR" =~ ^(21|22|23)$ ]]; then
  run_in_api "npm run sync:kbo-standings"
fi
