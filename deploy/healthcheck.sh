#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://127.0.0.1:8080/actuator/health}"
ATTEMPTS="${2:-20}"

for i in $(seq 1 "$ATTEMPTS"); do
  if body=$(curl -fsS --max-time 5 "$URL" 2>/dev/null); then
    if [[ "$body" == *'"status":"UP"'* ]]; then
      echo "health OK: $URL"
      exit 0
    fi
  fi
  echo "waiting for health ($i/$ATTEMPTS): $URL"
  sleep 3
done

echo "health check failed: $URL" >&2
exit 1
