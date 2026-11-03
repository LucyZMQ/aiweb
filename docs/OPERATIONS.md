# 运维、备份与回滚

这份文档是上线后的「值班手册」。目标不是让你每天盯着服务器，而是出问题时知道先看哪里。

## 1. 日常检查

每天花 2 分钟：

```bash
curl -fsS https://blog.example.com/actuator/health
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs --since=24h api | grep -iE 'error|exception' | tail -30
```

关注：

- 健康检查是否 `UP`。
- 容器是否反复重启（`Restarting`）。
- 5xx 是否突增。
- 磁盘是否接近满：`df -h`、`docker system df`。
- 数据库连接是否耗尽：日志里的 `HikariPool`。
- COS/CDN 流量是否异常（防盗链、刷量）。

## 2. 发布流程

### 正常发布

```text
本地改代码 → 提交 → push main
  → CI 测试
  → 构建镜像（tag = commit SHA）
  → 服务器拉取 + 重启
  → 健康检查
  → 飞书通知
```

发布前检查：

- [ ] 数据库迁移是向前兼容的。
- [ ] 新增环境变量已在服务器 `.env` 配好。
- [ ] 没有把 `.env`、密钥、测试账号提交进 Git。
- [ ] 前端构建通过（`pnpm build`）。
- [ ] 后端测试通过（`mvn test`）。

### 发布后检查

1. 首页、文章页、后台登录各打开一次。
2. 发布一篇草稿，确认写入与公开读取正常。
3. 上传一张图片，确认 CDN/COS URL 可访问。
4. 看后台 PV/UV 是否增长。
5. 飞书收到绿色卡片。

## 3. 回滚

### 代码/镜像回滚

```bash
cd /opt/moyu
git log --oneline -10

# 方式一：用历史镜像 tag 直接启动
IMAGE_TAG=<previous-sha> docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d

# 方式二：回到历史 commit（compose/Caddyfile 也一起回滚）
git checkout <previous-sha>
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d
```

> 回滚代码不会自动回滚数据库。如果新版本已经执行了破坏性迁移，需要先用备份恢复数据库，再回滚代码。

### 数据库回滚原则

Flyway 默认不提供 `undo`。生产迁移遵循 expand/contract：

1. **Expand**：加新列/新表，旧代码仍可运行。
2. **Migrate**：新代码双写或回填。
3. **Contract**：确认无旧实例后，删除旧列/旧约束。

不要在同一个发布里做「加列 + 删旧列」。这样任何一步失败都能安全回滚。

## 4. 备份与恢复

### 备份

```bash
cd /opt/moyu
./deploy/backup-db.sh
```

- 输出：`backups/moyu-YYYYMMDD-HHMMSS.sql.gz`
- 默认保留 14 天。
- 建议每天 03:30 定时执行，并同步到 COS 另一个桶。

### 恢复演练（每季度至少一次）

不要等真出事才第一次用恢复命令。找一台测试机：

```bash
# 1. 启动一个空数据库
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d db

# 2. 恢复
gunzip -c backups/moyu-20261103-033000.sql.gz | \
  docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T db psql -U moyu -d moyu

# 3. 验证行数
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T db \
  psql -U moyu -d moyu -c 'select count(*) from posts; select count(*) from users;'

# 4. 启动 API，打开首页和后台
```

恢复后检查：

- 文章数量、最近更新时间。
- 管理员能否登录（用户表是否恢复）。
- 图片 URL 是否仍可访问（COS 不随数据库备份，但对象一般不会丢）。
- Flyway `schema_history` 版本是否与代码匹配。

### 对象存储备份

数据库备份不包含 COS 里的图片。建议：

- 开启 COS 版本控制。
- 用生命周期规则把历史版本转低频存储。
- 定期用 `coscmd` / SDK 同步到另一个桶或本地。

## 5. 故障处理

### 5.1 站点 502

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs --tail=200 api
```

常见原因：

- API 启动失败：数据库连不上、`JWT_SECRET` 太短、COS 配置缺失导致 Bean 初始化失败。
- 数据库没起来：`db` 容器 unhealthy，检查磁盘和密码。
- Caddy 正常但 upstream 不对：确认 compose 服务名是 `api`、`web`。

临时恢复：

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml restart api
```

如果重启无效，回滚上一个镜像 tag。

### 5.2 登录收不到验证码

1. 看 API 日志有没有 `MailSendException`。
2. 用 SMTP 服务商的控制台查看投递记录。
3. 检查发件域名 SPF/DKIM。
4. 临时把 `MAIL_MODE=log`，从日志拿验证码登录，先恢复后台可用，再修邮件。

### 5.3 上传失败

- 本地存储：检查 `uploads` volume 权限和磁盘。
- COS：检查 SecretId/Key、Bucket、Region、CAM 权限。
- 413：文件超过 10MB，或 Nginx `client_max_body_size` 太小。
- 图片能上传但打不开：CDN 回源/防盗链/HTTPS 证书问题。

### 5.4 数据库连接耗尽

- 看 `HikariPool` 日志。
- 确认没有慢查询长时间占用连接。
- 临时把 `DB_POOL_SIZE` 调小，避免把数据库打满。
- 长期方案：加索引、分页、读写分离或换 RDS。

### 5.5 被刷 / 流量异常

- Cloudflare 开启 Under Attack / WAF。
- COS 开启防盗链、用量封顶。
- 给 `/api/analytics/collect` 和 `/api/auth/email-code` 加网关限流。
- 封禁异常 IP（Cloudflare WAF 规则）。
- 检查是否有人恶意上传大文件。

## 6. 安全事件响应

如果怀疑密钥泄露：

1. **立即轮换**：`JWT_SECRET`、SMTP 密码、COS 密钥、GitHub PAT、SSH Key。
2. 轮换 `JWT_SECRET` 会让所有登录态失效，这是预期行为。
3. 检查数据库是否有异常用户/文章。
4. 检查 COS 是否被写入未知对象、是否产生异常流量。
5. 检查服务器登录日志：`last`、`journalctl -u ssh`。
6. 复盘：密钥是怎么进入代码/日志/截图的？补 `.gitignore` 和 Secret Scanning。

## 7. 扩容路径

当前是单实例，够个人博客使用。流量上来后按顺序做：

1. **图片全部上 COS + CDN**，服务器只出 HTML/JS/API。
2. **数据库换 RDS**，开启自动备份、慢查询日志、连接池监控。
3. **API 水平扩展**：JWT 无状态，直接多副本；把上传切到 COS；限流从数据库计数换成 Redis。
4. **静态资源上 CDN**：Nginx 只做回源。
5. **读写分离 / 缓存**：热门文章缓存到 Redis，阅读量异步回写。
6. **可观测性**：接入 SLS/CLS + 告警，接入 Sentry 做前端错误收集。

## 8. 成本控制

- 服务器：2C4G 包年通常比按量便宜；闲置时降配。
- COS：开启用量告警和防盗链，避免被刷。
- CDN：设置流量封顶，静态资源长缓存提高命中率。
- 数据库：先自建，数据重要后换 RDS；备份存低频存储。
- 日志：容器日志轮转，避免磁盘被写满。
- Render/Neon：注意免费额度与休眠策略，别把生产密码放在免费演示环境。

## 9. 命令速查

```bash
# 状态
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f --tail=100 api

# 重启单个服务
docker compose --env-file .env -f deploy/docker-compose.prod.yml restart api

# 拉取新镜像并滚动重启
docker compose --env-file .env -f deploy/docker-compose.prod.yml pull
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --remove-orphans

# 健康检查
curl -fsS https://blog.example.com/actuator/health

# 进入数据库
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec db psql -U moyu -d moyu

# 备份
./deploy/backup-db.sh

# 清理悬空镜像
docker image prune -f

# 查看磁盘
df -h
docker system df
```

## 10. 上线后第一周建议

- 每天看一次错误日志和健康检查。
- 发 2–3 篇真实文章，验证编辑器与图片链路。
- 用手机 4G 访问一次，确认没有只在局域网可用的资源。
- 检查百度统计与第一方 PV 的差异，确认埋点没有被广告拦截器完全挡住。
- 故意触发一次部署失败，确认飞书红色卡片和回滚流程可用。
- 把 `.env` 和备份文件放到密码管理器/安全位置，不要只存在服务器上。
