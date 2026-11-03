#!/usr/bin/env bash
set -euo pipefail

# 仅用于全新 Ubuntu 22.04/24.04 云主机。
# 会安装 Docker、创建 /opt/moyu、开放 22/80/443。
# 执行前请确认这是你自己的服务器，并已配置好 SSH 密钥登录。

if [[ "${EUID}" -ne 0 ]]; then
  echo "请使用 root 执行: sudo bash deploy/bootstrap-server.sh"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "==> installing Docker"
  apt-get update -y
  apt-get install -y ca-certificates curl git jq ufw
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo "==> Docker already installed"
fi

echo "==> creating /opt/moyu"
mkdir -p /opt/moyu/backups

if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

cat <<'EOF'

服务器初始化完成。接下来的步骤：

1. 把仓库放到 /opt/moyu（任选其一）
   git clone https://github.com/<you>/<repo>.git /opt/moyu
   或在本地 rsync -av --exclude node_modules ./ user@host:/opt/moyu/

2. 配置生产环境变量
   cd /opt/moyu
   cp deploy/.env.production.example .env
   chmod 600 .env
   vi .env

3. 登录 GHCR 并启动
   echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin
   docker compose --env-file .env -f deploy/docker-compose.prod.yml pull
   docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d

4. 配置 DNS：A 记录指向这台服务器的公网 IP
   等待 Caddy 自动签发 HTTPS 证书，然后访问 https://<DOMAIN>

5. 添加每日备份（可选）
   crontab -e
   30 3 * * * cd /opt/moyu && ./deploy/backup-db.sh >> /var/log/moyu-backup.log 2>&1
EOF
