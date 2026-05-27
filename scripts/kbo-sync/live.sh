#!/usr/bin/env bash
BATCH_NAME=live
# shellcheck source=common.sh
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

GC_MODE="${GC_MODE:-today}"

run_in_api "npm run sync:kbo-schedule -- --mode=today"
run_in_api "npm run sync:kbo-game-center -- --mode=${GC_MODE}"
