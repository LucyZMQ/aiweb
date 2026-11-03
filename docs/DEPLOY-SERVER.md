# 云服务器上线：Docker + Caddy + GitHub Actions

适合国内正式访问：一台云主机、一个备案域名、一个对象存储桶，就能承载博客和后台。

> 国内服务器绑定域名对外提供 Web 服务，通常需要完成 ICP 备案。备案前 80/443 可能被拦截，这是政策限制，不是代码问题。香港/海外服务器不需要备案，但国内访问延迟更高。

## 1. 买什么

| 资源 | 建议 | 说明 |
| --- | --- | --- |
| 云服务器 | 2 vCPU / 4GB / 40GB SSD | 阿里云 ECS、腾讯云 CVM、轻量应用服务器均可 |
| 操作系统 | Ubuntu 22.04 / 24.04 LTS | 下面的脚本按 Ubuntu 编写 |
| 带宽 | 3–5 Mbps 起 | 图片走 COS/CDN，服务器只出 HTML/JS/API |
| 域名 | 已备案 | `.com` / `.cn` 均可 |
| 数据库 | 先用 Docker 内的 PostgreSQL | 数据重要后换 RDS，并做每日备份 |
| 对象存储 | 腾讯云 COS | 图片不落在服务器磁盘 |
| CDN | Cloudflare 或腾讯云 CDN | 静态资源边缘缓存 |

一台 2C4G 足够跑这个项目。真正的瓶颈通常是带宽和数据库，不是 CPU。

## 2. 初始化服务器

安全组 / 防火墙放行：

- `22/tcp`：SSH
- `80/tcp`：HTTP（Caddy 申请证书 + 跳转）
- `443/tcp`：HTTPS
- `443/udp`：HTTP/3（可选）

登录服务器：

```bash
ssh root@<公网IP>
```

把仓库放到服务器：

```bash
git clone https://github.com/<you>/<repo>.git /opt/moyu
cd /opt/moyu
```

如果仓库是私有的，先在服务器配置 GitHub Deploy Key，或在本地用 `rsync` 上传。

安装 Docker 与基础工具：

```bash
sudo bash deploy/bootstrap-server.sh
```

脚本会安装 Docker、创建 `/opt/moyu`、开放 22/80/443。执行前请确认这是你自己的服务器，并已使用 SSH 密钥登录。

## 3. 配置生产环境变量

```bash
cd /opt/moyu
cp deploy/.env.production.example .env
chmod 600 .env
vi .env
```

必须修改的字段：

```text
DOMAIN=blog.example.com
ACME_EMAIL=you@example.com
IMAGE_PREFIX=ghcr.io/<owner>/<repo>
DB_PASSWORD=<随机强密码>
JWT_SECRET=<openssl rand -hex 32>
ADMIN_EMAILS=you@example.com
ANALYTICS_IP_SALT=<另一个随机串>
MAIL_*=<真实 SMTP>
```

生成随机密钥：

```bash
openssl rand -hex 32
```

如果暂时不用 COS，先设：

```text
STORAGE_PROVIDER=local
```

上传文件会落在 Docker volume `uploads` 中，服务器迁移时要一起备份。

## 4. 配置 DNS 与自动 HTTPS

在域名解析里添加：

| 类型 | 主机记录 | 记录值 | TTL |
| --- | --- | --- | --- |
| A | `@` 或 `blog` | 服务器公网 IP | 600 |

**第一次申请证书时，建议先关闭 Cloudflare 代理（DNS only / 灰色云）**，让 Caddy 通过 HTTP-01 完成 Let's Encrypt 验证。证书签发后再决定是否打开代理。

Caddy 会自动：

- 申请证书
- 80 跳转 443
- 到期前自动续期
- 启用 HTTP/2 / HTTP/3
- 设置 HSTS 等安全头

查看证书状态：

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f caddy
```

看到 `certificate obtained successfully` 即可。

## 5. 第一次启动

镜像由 GitHub Actions 构建并推送到 GHCR。第一次需要先登录：

```bash
echo "<GitHub PAT，至少 read:packages>" | docker login ghcr.io -u <github-user> --password-stdin
```

确认 `.env` 中 `IMAGE_PREFIX` 与工作流推送的地址一致：

```text
ghcr.io/<owner>/<repo>/moyu-api
ghcr.io/<owner>/<repo>/moyu-web
```

启动：

```bash
cd /opt/moyu
docker compose --env-file .env -f deploy/docker-compose.prod.yml pull
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
```

健康检查：

```bash
curl -fsS https://blog.example.com/actuator/health
```

应返回：

```json
{"status":"UP"}
```

打开：

- `https://blog.example.com`
- `https://blog.example.com/admin`
- `https://blog.example.com/swagger-ui.html`

## 6. 配置 GitHub Actions 自动部署

### 6.1 Variables

仓库 Settings → Secrets and variables → Actions → Variables：

```text
DEPLOY_TARGET=server
SITE_URL=https://blog.example.com
```

### 6.2 Secrets

```text
SSH_HOST=<服务器公网 IP>
SSH_USER=root
SSH_KEY=<用于部署的私钥>
SSH_PORT=22
GHCR_USERNAME=<GitHub 用户名>
GHCR_TOKEN=<GitHub PAT，read:packages>
FEISHU_WEBHOOK=<飞书机器人 Webhook>
```

`SSH_KEY` 建议单独生成一把部署密钥：

```bash
ssh-keygen -t ed25519 -C "moyu-deploy" -f ~/.ssh/moyu_deploy
ssh-copy-id -i ~/.ssh/moyu_deploy.pub root@<服务器IP>
```

把 `~/.ssh/moyu_deploy` 的**私钥全文**放进 `SSH_KEY`。

### 6.3 工作流做了什么

`.github/workflows/deploy.yml`：

1. 等待 `CI` 成功。
2. 构建 `moyu-api` 与 `moyu-web` 镜像，推送到 GHCR，tag 为 commit SHA + `latest`。
3. SSH 到服务器：
   - `git fetch` 并切到同一个 commit，保证 compose / Caddyfile 与镜像版本一致。
   - 读取 `.env`。
   - `docker compose pull` + `up -d --remove-orphans`。
   - 调健康检查，最多等 90 秒。
4. 飞书通知：成功绿色卡片，失败红色卡片，带提交和流水线链接。

把 `DEPLOY_TARGET` 设为 `server` 后，下一次 push 到 `main` 会自动发布。

## 7. 回滚

镜像 tag 就是 commit SHA，所以回滚不需要重新构建：

```bash
cd /opt/moyu
git log --oneline -5
IMAGE_TAG=<上一个 commit SHA> docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d
```

或者：

```bash
git checkout <上一个 commit>
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d
```

数据库迁移默认只向前。回滚代码前先确认这次发布没有包含不可逆的 `V2__*.sql`。写迁移时遵循「先兼容、再删除」：

1. 新增列，允许 NULL；
2. 发布读写新列的代码；
3. 确认无旧实例后，再加约束/删除旧列。

## 8. 备份

手动备份：

```bash
cd /opt/moyu
./deploy/backup-db.sh
```

输出在 `backups/moyu-YYYYMMDD-HHMMSS.sql.gz`，默认保留 14 天。

每日 03:30 自动备份：

```bash
crontab -e
```

加入：

```cron
30 3 * * * cd /opt/moyu && ./deploy/backup-db.sh >> /var/log/moyu-backup.log 2>&1
40 3 * * * find /opt/moyu/backups -name 'moyu-*.sql.gz' -mtime +14 -delete
```

恢复：

```bash
gunzip -c backups/moyu-20261103-033000.sql.gz | \
  docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T db psql -U moyu -d moyu
```

**备份必须异地保存。** 至少定期把 `backups/` 同步到 COS 或另一台机器。

## 9. Cloudflare CDN（可选）

服务器本身已经由 Caddy 提供 HTTPS。Cloudflare 负责 DNS、边缘缓存和 DDoS 防护。

1. 域名 NS 接入 Cloudflare。
2. 记录先 DNS only，等 Caddy 证书签发。
3. 打开代理（橙色云），SSL/TLS 设为 **Full (strict)**。
4. 添加 Cache Rules：

| 路径 | 策略 |
| --- | --- |
| `/api/*` | Bypass |
| `/assets/*` | Cache，Edge TTL 1 年 |
| `/covers/*` | Cache，30 天 |
| `/uploads/*` | Cache，1 年 |
| `/`、`/posts/*` | 不缓存 HTML |

5. 如果打开代理后出现重定向循环，检查 Caddy 是否能拿到 `X-Forwarded-Proto`（Caddy 默认会处理），并把 Cloudflare SSL 模式设为 Full (strict)，不要用 Flexible。

> 图片建议直接走 COS + CDN，不经过服务器。这样 Cloudflare 只负责 HTML/JS/CSS/API。

## 10. 阿里云云效流水线

如果你更想用云效而不是 GitHub Actions：

### 10.1 准备

1. 云效 → 企业设置 → 服务连接 → 新建 GitHub 服务连接，授权仓库。
2. 云效 → 主机组 → 新建主机组，把 ECS 添加进去（需要 SSH 密钥）。
3. 在服务器 `/opt/moyu` 放好仓库和 `.env`。
4. 在云效流水线「变量与缓存」中配置：
   - `FEISHU_WEBHOOK`
   - `DOMAIN`
5. 复制 `deploy/aliyun-yunxiao.yml` 到「YAML 流水线」，替换：
   - `<owner>/<repo>`
   - `<github-service-connection-id>`
   - `<machine-group-id>`

### 10.2 它怎么工作

```text
GitHub push
  → 云效 JavaBuild（mvn package）
  → 云效 NodeBuild（pnpm build）
  → ArtifactUpload（jar + dist + deploy 目录）
  → VMDeploy 到 ECS
  → docker compose --env-file .env -f deploy/docker-compose.runtime.yml up -d --build
  → 健康检查
  → 飞书通知
```

`docker-compose.runtime.yml` 不依赖镜像仓库：服务器用上传的 jar/dist 现场构建镜像。适合不想额外维护 ACR/GHCR 的场景，代价是首次构建稍慢。

### 10.3 注意事项

- `VMDeploy` 的 `artifactDownloadPath` 和 `filePath` 会因云效版本略有差异。第一次运行后检查 `/opt/moyu/staging` 的目录结构，必要时调整 YAML 里的 `cp` 路径。
- 失败通知建议在云效「流水线设置 → 通知」里配置飞书群机器人；YAML 最后一个步骤不会在失败时执行。
- 云效构建机的 Node 版本如果低于 22，在 NodeBuild 步骤里切换 Node 22，或改用 `Command` 步骤自行安装。
- 需要把 `deploy/.env.production.example` 复制为服务器 `.env`，云效不会替你保管这些密钥。

## 11. 日志与排查

```bash
cd /opt/moyu

# 所有服务
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f --tail=100

# 只看 API
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f api

# 只看 Caddy（证书问题）
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f caddy

# 容器状态
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
```

常见问题：

**502 Bad Gateway**
API 容器没起来或健康检查失败。看 `logs api`，多数是数据库密码、`JWT_SECRET` 太短或 COS 配置缺失。

**Caddy 证书申请失败**
域名没有解析到这台机器、80 端口没放行，或 Cloudflare 代理挡住了 HTTP-01。先改 DNS only，证书签发后再开代理。

**磁盘满了**
`docker system df` 查看镜像和日志；`docker image prune -f` 清理旧镜像。上传目录和数据库 volume 不要乱删。

**上传文件重启后消失**
用了 `local` 存储但 volume 没挂载。检查 compose 里 `uploads:/app/data/uploads`。

## 12. 安全清单

- [ ] 只开放 22/80/443，数据库端口不暴露公网。
- [ ] SSH 禁用密码登录，只允许密钥。
- [ ] `.env` 权限 600，且不在 Git 里。
- [ ] `EXPOSE_DEV_CODE=false`。
- [ ] `ADMIN_EMAILS` 只包含自己的邮箱。
- [ ] COS 使用子账号最小权限，不用主账号密钥。
- [ ] 开启云厂商的 DDoS / WAF 基础防护。
- [ ] 每日备份并异地保存，至少每季度做一次恢复演练。
- [ ] 定期 `apt upgrade` 与重建基础镜像，修复系统/依赖漏洞。
