#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN="${PG_BIN:-$ROOT/.tools/pgsql/bin}"
PGDATA="${PGDATA:-$ROOT/.data/postgres}"
PGPORT="${PGPORT:-5433}"
PGBIN="$PG_BIN"

if [[ ! -x "$PGBIN/initdb" ]]; then
  echo "找不到 PostgreSQL 二进制：$PGBIN"
  echo "macOS 可运行 scripts/setup-local.sh 下载便携运行时，或使用 docker compose up -d db。"
  exit 1
fi

if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
  mkdir -p "$PGDATA"
  "$PGBIN/initdb" -D "$PGDATA" -U moyu --auth=trust --encoding=UTF8 --locale=C >/dev/null
fi

if "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  echo "PostgreSQL 已在运行（端口 ${PGPORT}）"
else
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$ROOT/.data/postgres.log" \
    -o "-p $PGPORT -h 127.0.0.1" start >/dev/null
  echo "PostgreSQL 已启动（端口 ${PGPORT}）"
fi

if ! "$PGBIN/psql" -h 127.0.0.1 -p "${PGPORT}" -U moyu -d postgres -tAc \
  "select 1 from pg_database where datname='moyu'" | grep -q 1; then
  "$PGBIN/createdb" -h 127.0.0.1 -p "${PGPORT}" -U moyu moyu
  echo "已创建数据库 moyu"
fi

echo "DATABASE_URL=jdbc:postgresql://127.0.0.1:$PGPORT/moyu"
