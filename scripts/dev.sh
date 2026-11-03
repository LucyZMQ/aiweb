#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.tools/env.sh" ]]; then
  echo "首次运行，请先执行: ./scripts/setup-local.sh"
  exit 1
fi

mkdir -p "$ROOT/.data"
"$ROOT/scripts/dev-db.sh"

source "$ROOT/.tools/env.sh"
cd "$ROOT/apps/api"
mvn -Dmaven.repo.local="$ROOT/.tools/m2" spring-boot:run > "$ROOT/.data/api.log" 2>&1 &
API_PID=$!

cleanup() {
  echo ""
  echo "正在停止 API（PID $API_PID）…"
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "等待 API 启动…"
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/actuator/health >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API 启动失败，日志：.data/api.log"
    tail -40 "$ROOT/.data/api.log"
    exit 1
  fi
  sleep 1
done

echo ""
echo "  前端  http://127.0.0.1:5173"
echo "  后台  http://127.0.0.1:5173/admin"
echo "  接口  http://127.0.0.1:8080/swagger-ui.html"
echo "  邮箱  admin@moyu.local（验证码会显示在页面上）"
echo ""

cd "$ROOT/apps/web"
export npm_config_cache="$ROOT/.tools/npm-cache"
export XDG_CACHE_HOME="$ROOT/.tools/cache"
pnpm dev
