#!/usr/bin/env bash
set -euo pipefail

RUNS=10
SINCE="${1:-HEAD}"
run=1

while [ "$run" -le "$RUNS" ]; do
  pnpm exec vitest run --changed "$SINCE" --sequence.shuffle \
    --project client --project server --passWithNoTests
  run=$((run + 1))
done
