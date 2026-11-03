#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/.tools/env.sh"

cd "$ROOT/apps/api"
exec mvn -Dmaven.repo.local="$ROOT/.tools/m2" spring-boot:run
