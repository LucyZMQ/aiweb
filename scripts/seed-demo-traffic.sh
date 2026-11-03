#!/usr/bin/env bash
set -euo pipefail

# 仅用于本地演示：生成最近 14 天的 PV/UV 样品数据。
# 会清空 page_views 表。不要在生产库执行。
# 用法: ./scripts/seed-demo-traffic.sh --yes

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${1:-}" != "--yes" ]]; then
  echo "这会清空本地 page_views 表并写入演示数据。"
  read -r -p "确认继续？输入 yes: " answer
  [[ "$answer" == "yes" ]] || exit 1
fi

if [[ -x "$ROOT/.tools/pgsql/bin/psql" ]]; then
  PSQL=("$ROOT/.tools/pgsql/bin/psql" -h 127.0.0.1 -p "${PGPORT:-5433}" -U moyu -d moyu)
elif command -v docker >/dev/null 2>&1 && docker compose ps db >/dev/null 2>&1; then
  PSQL=(docker compose exec -T db psql -U moyu -d moyu)
else
  echo "找不到本地 PostgreSQL，请先运行 ./scripts/dev-db.sh"
  exit 1
fi

"${PSQL[@]}" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
TRUNCATE page_views;

INSERT INTO page_views (id, path, referrer, visitor_id, session_id, user_agent, ip_hash, created_at)
SELECT
  gen_random_uuid(),
  (ARRAY[
    '/',
    '/posts/small-systems-clear-boundaries',
    '/posts/a-quiet-release',
    '/posts/a-dashboard-for-the-blog',
    '/posts/room-in-the-edge-cache',
    '/about'
  ])[1 + floor(random() * 6)],
  CASE WHEN random() < 0.45 THEN 'https://www.google.com/' ELSE '' END,
  'demo-v-' || d || '-' || (i % (8 + d)),
  'demo-s-' || d || '-' || (i % 3),
  'Mozilla/5.0 (Macintosh) MOYU-demo-seed',
  encode(hmac('127.0.0.1', 'demo-seed', 'sha256'), 'hex'),
  now() - (d || ' days')::interval - (random() * interval '20 hours')
FROM generate_series(0, 13) AS d,
     generate_series(1, 30 + (13 - d) * 4) AS i;

SELECT
  count(*) AS pv,
  count(distinct visitor_id) AS uv,
  min(created_at)::date AS from_day,
  max(created_at)::date AS to_day
FROM page_views;
SQL

echo "演示流量已写入。刷新后台总览即可看到趋势。"
