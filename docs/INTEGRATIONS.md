# 第三方服务接入

这份文档把每个外部依赖拆成四件事：**去哪申请、填什么变量、代码在哪、怎么验证**。

## 环境变量总表

| 变量 | 默认值 | 必填 | 说明 |
| --- | --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://127.0.0.1:5433/moyu` | 生产必填 | 完整 JDBC URL；也可用下面的 DB_* 拼接 |
| `DB_HOST` | `127.0.0.1` | 否 | 未设置 `DB_URL` 时生效 |
| `DB_PORT` | `5433` | 否 | Docker 内是 `5432` |
| `DB_NAME` | `moyu` | 否 | |
| `DB_USER` | `moyu` | 是 | |
| `DB_PASSWORD` | `moyu_dev_password` | 生产必填 | |
| `JWT_SECRET` | 开发默认值 | 生产必填 | ≥32 字节，`openssl rand -hex 32` |
| `JWT_TTL` | `7d` | 否 | 登录态有效期 |
| `ADMIN_EMAILS` | `admin@moyu.local` | 生产必填 | 逗号分隔；只有这些邮箱能进后台 |
| `EXPOSE_DEV_CODE` | `true` | 生产必须 `false` | 是否在响应里返回验证码 |
| `CORS_ORIGINS` | localhost | 生产必填 | 前端域名，逗号分隔，无末尾斜杠 |
| `PUBLIC_BASE_URL` | 空 | 建议 | 本地上传文件的公开前缀 |
| `STORAGE_PROVIDER` | `local` | 否 | `local` / `cos` |
| `UPLOAD_DIR` | `./data/uploads` | 否 | 容器内 `/app/data/uploads` |
| `MAIL_MODE` | `log` | 生产 `smtp` | `log` 只打印验证码 |
| `MAIL_HOST` | 空 | SMTP 必填 | |
| `MAIL_PORT` | `587` | 否 | STARTTLS |
| `MAIL_USERNAME` | 空 | SMTP 必填 | |
| `MAIL_PASSWORD` | 空 | SMTP 必填 | |
| `MAIL_FROM` | `no-reply@moyu.local` | 建议 | 发件地址 |
| `MAIL_FROM_NAME` | `墨屿 MOYU` | 否 | |
| `GEETEST_ENABLED` | `false` | 否 | 配好后设 `true` |
| `GEETEST_CAPTCHA_ID` | 空 | 极验必填 | 可公开，前端需要 |
| `GEETEST_CAPTCHA_KEY` | 空 | 极验必填 | **只能放服务端** |
| `COS_SECRET_ID` | 空 | COS 必填 | 子账号 SecretId |
| `COS_SECRET_KEY` | 空 | COS 必填 | 子账号 SecretKey |
| `COS_REGION` | `ap-guangzhou` | COS 必填 | |
| `COS_BUCKET` | 空 | COS 必填 | 含 APPID 后缀 |
| `COS_CDN_DOMAIN` | 空 | 否 | `https://cdn.example.com` |
| `DEMO_DATA` | `true` | 否 | 空库时插入示例文章 |
| `ANALYTICS_TIMEZONE` | `Asia/Shanghai` | 否 | 按天聚合的时区 |
| `ANALYTICS_IP_SALT` | 开发默认值 | 生产必填 | IP 哈希盐 |
| `SPRINGDOC_ENABLED` | `true` | 否 | 生产可关掉 Swagger |
| `VITE_API_BASE_URL` | 空 | 否 | 同源部署留空 |
| `VITE_BAIDU_TONGJI_ID` | 空 | 否 | 百度统计 ID |

> Spring Boot 会把环境变量名映射到配置项。例如 `ADMIN_EMAILS` 对应 `app.auth.admin-emails`，`GEETEST_CAPTCHA_ID` 对应 `app.geetest.captcha-id`。

## 1. 极验 v4

### 申请

1. 注册 [极验](https://www.geetest.com/)。
2. 控制台 → 行为验证 → 新建应用（Web）。
3. 记录 **Captcha ID** 与 **Captcha Key**。
4. 在应用里配置域名白名单：`blog.example.com`、`localhost`。

### 配置

```bash
GEETEST_ENABLED=true
GEETEST_CAPTCHA_ID=xxxxxxxxxxxxxxxx
GEETEST_CAPTCHA_KEY=xxxxxxxxxxxxxxxx
```

### 代码

- 前端：`apps/web/src/components/GeetestGate.tsx`
  - 动态加载 `https://static.geetest.com/v4/gt4.js`
  - 成功后把 `lot_number / captcha_output / pass_token / gen_time` 传给后端
- 后端：`apps/api/src/main/java/com/moyu/blog/auth/GeetestService.java`
  - 使用 Captcha Key 对 `lot_number` 做 HMAC-SHA256，得到 `sign_token`
  - POST 到 `https://gcaptcha4.geetest.com/validate`
  - 只有 `result=success` 才继续发送验证码

### 本地不配极验

`GEETEST_ENABLED=false` 时：

- `/api/auth/captcha/config` 返回 `{enabled:false}`
- 前端不加载 SDK，直接请求验证码
- 后端跳过校验

这是开发模式的默认值，生产务必打开。

### 验证

1. 打开登录页，点击「发送验证码」。
2. 应弹出极验滑块/点选。
3. 完成后网络面板里 `/api/auth/email-code` 请求体包含 `captcha` 对象。
4. 极验失败时不应收到邮件。

### 排查

- 弹出空白：域名未在极验白名单，或 `gt4.js` 被广告拦截器拦截。
- 后端 400「人机验证未通过」：Captcha ID / Key 不匹配，或验证码已被使用。
- 后端 502「人机验证服务暂时不可用」：服务器无法访问极验 API，检查出网。

## 2. 邮箱验证码（SMTP）

### 方案选择

| 服务 | 适合 | 备注 |
| --- | --- | --- |
| Resend | 海外、个人项目 | 免费额度友好，配置简单 |
| 阿里云邮件推送 | 国内 | 需要发信域名、SPF/DKIM |
| 腾讯云 SES | 国内 | 同样需要域名验证 |
| Mailpit / MailHog | 本地 | 不需要真实邮箱，网页收件箱 |

### 配置

```bash
MAIL_MODE=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=587
MAIL_USERNAME=resend
MAIL_PASSWORD=re_xxxxxxxx
MAIL_FROM=no-reply@your-domain.com
MAIL_FROM_NAME=墨屿 MOYU
```

当前 `application.yml` 使用 STARTTLS（587）。如果服务商只支持 465 隐式 SSL，需要加：

```yaml
spring:
  mail:
    properties:
      mail:
        smtp:
          ssl:
            enable: true
          starttls:
            enable: false
```

### 代码

- `SmtpEmailService`：`MAIL_MODE=smtp` 时启用，发送纯文本验证码邮件。
- `LoggingEmailService`：`MAIL_MODE=log` 时启用，只打印验证码，不连接 SMTP。

### 验证

```bash
curl -X POST http://127.0.0.1:8080/api/auth/email-code \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@moyu.local"}'
```

本地会返回 `devCode`，同时日志里能看到验证码。生产 `EXPOSE_DEV_CODE=false` 时只返回「已发送」。

### 排查

- `AuthenticationFailedException`：用户名/密码错误，或服务商要求使用「发信密码」而不是登录密码。
- 邮件进垃圾箱：配置 SPF、DKIM、DMARC；不要用个人 QQ 邮箱直接发。
- 发送超时：服务器安全组/出网限制 587 端口。

## 3. 腾讯云 COS

### 申请

1. 腾讯云 → 对象存储 → 创建存储桶。
2. 地域例如 `ap-guangzhou`；访问权限「公有读私有写」。
3. 记录 Bucket 全名，例如 `moyu-1250000000`。
4. 访问管理 CAM → 用户 → 新建子用户（编程访问），只授予该桶的：

   ```json
   {
     "version": "2.0",
     "statement": [
       {
         "effect": "allow",
         "action": [
           "cos:PutObject",
           "cos:GetObject",
           "cos:DeleteObject"
         ],
         "resource": [
           "qcs::cos:ap-guangzhou:uid/1250000000:moyu-1250000000/*"
         ]
       }
     ]
   }
   ```

5. 生成 SecretId / SecretKey。

### 配置

```bash
STORAGE_PROVIDER=cos
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_REGION=ap-guangzhou
COS_BUCKET=moyu-1250000000
COS_CDN_DOMAIN=https://cdn.example.com
```

### 代码

- `StorageService`：统一接口。
- `LocalStorageService`：写到 `UPLOAD_DIR`，通过 `/uploads/**` 提供访问。
- `CosStorageService`：`COSClient.putObject`，返回 CDN 或 COS 源站 URL。
- `MediaService`：校验类型（JPG/PNG/WebP/GIF/AVIF）、大小（10MB），落 `media_assets`。

### 从本地切到 COS

1. 配置上述变量并重启 API。
2. 后台上传一张新图，确认返回 URL 是 `cdn.example.com` 或 `cos.ap-guangzhou.myqcloud.com`。
3. 旧图片仍在本地 `/uploads/...`；如果要迁移：
   - 用 COS 客户端把 `data/uploads/` 上传到桶；
   - 批量更新 `media_assets.url` 和文章正文里的图片链接；
   - 保留本地文件一段时间，确认无 404 后再删。

### CDN

1. COS → 域名与传输管理 → 添加自定义 CDN 域名。
2. DNS 加 CNAME，开启 HTTPS（腾讯云可申请免费证书）。
3. 缓存配置：图片路径 30 天以上；忽略查询参数（对象键本身唯一）。
4. 开启防盗链（Referer 白名单）和用量告警，避免被盗刷流量。

### 验证

```bash
TOKEN=<登录返回的 JWT>
curl -X POST http://127.0.0.1:8080/api/admin/media \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@cover.png;type=image/png'
```

返回的 `url` 应可直接在浏览器打开。

### 排查

- 403：SecretId/Key 没有该桶权限，或 Bucket 名少了 APPID。
- `NoSuchBucket`：Region 与 Bucket 所在地域不一致。
- 上传成功但图片 404：CDN 回源配置错误，或对象键被改过。
- 想支持大文件：改预签名直传，不要让 100MB 文件穿过 Spring Boot。

## 4. 百度统计

### 配置

1. [百度统计](https://tongji.baidu.com/) → 管理 → 新增网站。
2. 复制 `hm.js?` 后面的 ID。
3. 前端环境变量：

   ```bash
   VITE_BAIDU_TONGJI_ID=abcdef1234567890
   ```

4. 重新构建/部署前端。

### 代码

`apps/web/src/components/Analytics.tsx`：

- 首次加载注入 `hm.js`。
- 路由变化时 `_hmt.push(['_trackPageview', path])`。
- `/admin` 路径跳过。
- 同时调用第一方 `/api/analytics/collect`。

### 验证

1. 打开首页，浏览器 Network 里应看到 `hm.js` 和百度统计的 GIF 请求。
2. 百度统计后台「实时访客」应出现自己。
3. 自己的后台「总览」PV 也应 +1。

### 口径说明

| 指标 | 百度统计 | 第一方 |
| --- | --- | --- |
| PV | 百度 SDK 上报 | `page_views` 行数 |
| UV | 百度自己的访客识别 | `count(distinct visitor_id)` |
| 来源 | 百度解析 referrer | 原始 referrer（未做渠道归一） |
| 留存 | 百度能力 | 未实现 |

两边数字对不上是正常的：广告拦截、Do Not Track、脚本加载失败都会造成差异。以趋势为主，不要拿绝对值做财务决策。

## 5. 飞书机器人

### 申请

1. 飞书群 → 设置 → 群机器人 → 添加机器人 → 自定义机器人。
2. 安全设置建议选「自定义关键词」，填 `MOYU`。
3. 复制 Webhook。

### 配置

GitHub Secret：

```text
FEISHU_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
```

服务器 `.env`（云效部署用）：

```text
FEISHU_WEBHOOK=...
```

### 代码

`deploy/feishu-notify.sh` 用 `jq` 生成 interactive card：

- 成功：绿色 header + 提交 + 镜像 + 流水线链接 + 「打开站点」按钮。
- 失败：红色 header。
- 未设置 `FEISHU_WEBHOOK` 时跳过，不阻断部署。

### 注意

- 如果机器人开启「签名校验」，当前脚本不支持加签；改用关键词或 IP 白名单。
- 飞书 Webhook 是秘密，不要提交到仓库。
- 部署工作流的通知在 `deploy.yml` 的 `notify` job，`if: always()` 保证失败也发。

### 本地测试

```bash
export FEISHU_WEBHOOK='https://open.feishu.cn/open-apis/bot/v2/hook/xxx'
./deploy/feishu-notify.sh "墨屿 MOYU · 测试" success "**本地测试**：链路正常" "https://example.com"
```

## 6. GitHub Actions / GHCR

### CI

`.github/workflows/ci.yml`：

- Java 21 + Maven 缓存，执行 `mvn -B verify`（含集成测试）。
- pnpm 10 + Node 22，执行 `pnpm build`。
- 上传 jar / dist 制品，保留 7 天。

### 服务器部署

`.github/workflows/deploy.yml`：

- 由 CI 成功后触发，`DEPLOY_TARGET=server` 时执行。
- 镜像地址：`ghcr.io/<owner>/<repo>/moyu-api:<sha>`。
- SSH 部署，健康检查通过才发绿色飞书。

需要的 Secrets 见 [DEPLOY-SERVER.md](DEPLOY-SERVER.md#6-配置-github-actions-自动部署)。

### PaaS 部署

`.github/workflows/deploy-paas.yml`：

- `DEPLOY_TARGET=paas` 时执行。
- Cloudflare Pages 上传 + Render Deploy Hook + 健康检查 + 飞书。

### GHCR 权限

默认 `GITHUB_TOKEN` 只能推当前仓库的包。服务器拉取私有包需要 PAT：

- Classic PAT：勾选 `read:packages`。
- Fine-grained：仓库权限 `Packages: Read`。

### 常见失败

- `denied: permission_denied`：workflow 缺少 `packages: write`，或组织策略禁止。
- 服务器 `unauthorized`：PAT 过期 / 没有 `read:packages`。
- SSH 超时：安全组没放行、密钥不对、用户不是 root。
- 健康检查失败：容器启动失败，先看服务器 `docker compose logs api`。

## 7. 阿里云云效

完整 YAML 在 `deploy/aliyun-yunxiao.yml`，操作步骤见 [DEPLOY-SERVER.md](DEPLOY-SERVER.md#10-阿里云云效流水线)。

关键点：

- 代码源选 **GitHub**，需要先在云效「服务连接」里授权。
- 主机组需要把 ECS 加进去，并配置 SSH 密钥。
- 云效的 `artifactDownloadPath` / `filePath` 语法可能随版本变化，第一次跑完要检查制品目录。
- 云效不保存你的 `.env`，生产密钥要提前放在服务器 `/opt/moyu/.env`。

## 8. 本地联调速查

```bash
# 健康
curl -s http://127.0.0.1:8080/actuator/health

# 公开文章
curl -s http://127.0.0.1:8080/api/public/posts

# 发验证码（本地会返回 devCode）
curl -s -X POST http://127.0.0.1:8080/api/auth/email-code \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@moyu.local"}'

# 登录（把 code 换成上一步的 devCode）
curl -s -X POST http://127.0.0.1:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@moyu.local","code":"123456"}'

# 埋点
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8080/api/analytics/collect \
  -H 'Content-Type: application/json' \
  -d '{"path":"/","visitorId":"local-test","sessionId":"local-test"}'

# 上传
curl -s -X POST http://127.0.0.1:8080/api/admin/media \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@cover.png;type=image/png'
```
