#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TOOLS="$ROOT/.tools"
mkdir -p "$TOOLS"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64) ARCH_API="aarch64"; PG_ARCH="aarch64" ;;
  x86_64|amd64) ARCH_API="x64"; PG_ARCH="x86_64" ;;
  *) echo "不支持的 CPU 架构: $ARCH"; exit 1 ;;
esac
case "$OS" in
  darwin) PG_OS="apple-darwin" ;;
  linux) PG_OS="unknown-linux-gnu" ;;
  *) echo "暂只支持 macOS / Linux；Windows 建议使用 Docker Compose"; exit 1 ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js 22+（https://nodejs.org）"
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "请先安装 pnpm 10：npm install -g pnpm@10"
  exit 1
fi

echo "==> JDK 21"
if [[ ! -x "$TOOLS/jdk-21/Contents/Home/bin/java" && ! -x "$TOOLS/jdk-21/bin/java" ]]; then
  curl -L --fail --retry 2 -o "$TOOLS/jdk21.tar.gz" \
    "https://api.adoptium.net/v3/binary/latest/21/ga/${OS}/${ARCH_API}/jdk/hotspot/normal/eclipse"
  rm -rf "$TOOLS/jdk-21" "$TOOLS"/jdk-21.*
  mkdir -p "$TOOLS/jdk-21"
  tar xzf "$TOOLS/jdk21.tar.gz" -C "$TOOLS/jdk-21" --strip-components=1
  rm "$TOOLS/jdk21.tar.gz"
fi

JAVA_BIN="$(find "$TOOLS/jdk-21" -type f -path '*/bin/java' | head -1)"
if [[ -z "$JAVA_BIN" ]]; then
  echo "JDK 安装失败：找不到 bin/java"
  exit 1
fi
JAVA_HOME="$(cd "$(dirname "$JAVA_BIN")/.." && pwd)"

echo "==> Maven 3.9.16"
if [[ ! -x "$TOOLS/apache-maven-3.9.16/bin/mvn" ]]; then
  curl -L --fail -o "$TOOLS/maven.tar.gz" \
    "https://dlcdn.apache.org/maven/maven-3/3.9.16/binaries/apache-maven-3.9.16-bin.tar.gz"
  tar xzf "$TOOLS/maven.tar.gz" -C "$TOOLS"
  rm "$TOOLS/maven.tar.gz"
fi

echo "==> PostgreSQL 18（便携版）"
if [[ ! -x "$TOOLS/pgsql/bin/postgres" ]]; then
  curl -L --fail --retry 2 -o "$TOOLS/pg.tar.gz" \
    "https://github.com/theseus-rs/postgresql-binaries/releases/download/18.6.1/postgresql-18.6.1-${PG_ARCH}-${PG_OS}.tar.gz"
  rm -rf "$TOOLS/pgsql"
  mkdir -p "$TOOLS/pgsql"
  tar xzf "$TOOLS/pg.tar.gz" -C "$TOOLS/pgsql" --strip-components=1
  rm "$TOOLS/pg.tar.gz"
fi

cat > "$TOOLS/env.sh" <<EOF
export JAVA_HOME="$JAVA_HOME"
export PATH="\$JAVA_HOME/bin:$TOOLS/apache-maven-3.9.16/bin:\$PATH"
EOF

echo "==> 安装前端依赖"
cd "$ROOT/apps/web"
export npm_config_cache="$TOOLS/npm-cache"
export XDG_CACHE_HOME="$TOOLS/cache"
pnpm install --store-dir "$TOOLS/pnpm-store" --frozen-lockfile

cd "$ROOT"
echo ""
echo "本地运行时准备完成。"
echo "  ./scripts/dev-db.sh     # 启动 PostgreSQL :5433"
echo "  ./scripts/dev-api.sh    # 启动 API :8080"
echo "  ./scripts/dev-web.sh    # 启动前端 :5173"
echo "  ./scripts/dev.sh        # 一键启动全部"
