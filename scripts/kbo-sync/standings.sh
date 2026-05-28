#!/usr/bin/env bash
BATCH_NAME=standings
# shellcheck source=common.sh
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

run_in_api "npm run sync:kbo-standings"
