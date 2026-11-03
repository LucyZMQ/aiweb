# 零服务器上线：Cloudflare Pages + Render + Neon

这条路线不需要购买服务器，适合先把项目真正跑在公网上。

最终结构：

```text
blog.example.com      → Cloudflare Pages（React 静态站点 + 全球 CDN + 自动 SSL）
api.example.com       → Render Web Service（Spring Boot Docker）
                       → Neon PostgreSQL
图片                   → 腾讯云 COS + CDN（可选，也可先用 Render 本地磁盘）
```

> 免费额度、休眠策略和区域会变化，以各平台控制台为准。Render 免费实例在一段时间无请求后会休眠，冷启动通常 30–90 秒；国内访问 Cloudflare / Render 的稳定性不如国内云。正式面向国内用户建议走 [云服务器路线](DEPLOY-SERVER.md)。

## 0. 没有域名的最短路径

没有域名也可以完整上线，先用平台送的二级域名：

```text
前端  https://<project>.pages.dev
API   https://<service>.onrender.com
```

SSL、CDN 都由平台自动提供。建议顺序：

1. GitHub 建仓库并 push 代码。
2. Neon 建库，拿连接串。
3. Render 用 Docker 部署 `apps/api`，先拿到 API 地址。
4. Cloudflare Pages 部署 `apps/web`，把 `VITE_API_BASE_URL` 指向 API。
5. 回到 Render 更新 `CORS_ORIGINS` 和 `PUBLIC_BASE_URL`。
6. 打开 `https://<project>.pages.dev/admin` 登录、发一篇文章。
7. 测试通过后，再考虑买域名、接 SMTP/COS/极验。

### 第一次登录没有 SMTP 怎么办

为了先跑通闭环，第一次可以临时设置：

```text
MAIL_MODE=log
EXPOSE_DEV_CODE=true
```

验证码会直接显示在登录页，也会打印在 Render 日志里。**这只用于你自己测试的 10 分钟**：

- 不要把 `pages.dev` 链接发到公开群组。
- 测试完立刻配置 SMTP，并把 `EXPOSE_DEV_CODE` 改成 `false` 后重新部署。
- 管理员邮箱用你自己的邮箱（`ADMIN_EMAILS`），不要长期保留默认的 `admin@moyu.local`。

### 注册入口

| 平台 | 入口 | 建议登录方式 |
| --- | --- | --- |
| GitHub | <https://github.com/signup> | 邮箱 + 强密码，开启 2FA |
| Neon | <https://console.neon.tech/signup> | Continue with GitHub |
| Render | <https://dashboard.render.com/register> | Continue with GitHub |
| Cloudflare | <https://dash.cloudflare.com/sign-up> | 邮箱 + 强密码，开启 2FA |

Neon 免费计划目前不需要信用卡；Render 免费实例有每月 750 小时额度，15 分钟无流量会休眠；Cloudflare Pages 免费计划足够个人站点使用。以控制台实际显示为准。

## 0. 你需要准备

| 项目 | 用途 | 是否必须 |
| --- | --- | --- |
| GitHub 账号 | 代码托管、Actions | 必须 |
| Cloudflare 账号 | Pages、DNS、CDN、SSL | 必须 |
| Render 账号 | 运行 API | 必须 |
| Neon 账号 | PostgreSQL | 必须（也可换 Supabase） |
| 一个域名 | 自定义域名；也可先用 `*.pages.dev` / `*.onrender.com` | 建议 |
| SMTP 服务 | 真实发送验证码 | 必须（否则无法登录生产后台） |
| 腾讯云账号 | COS 对象存储 | 可选，但推荐 |
| 极验账号 | 人机验证 | 可选 |
| 百度统计账号 | 第三方 PV/UV | 可选 |
| 飞书群机器人 | 部署通知 | 可选 |

先不用急着全部注册。可以先用平台默认域名 + 日志验证码把流程跑通，再逐项替换。

## 1. 创建 Neon PostgreSQL

1. 登录 [Neon](https://neon.tech)，新建 Project，区域选离 Render 较近的（如 Singapore）。
2. 复制连接串，形如：

   ```text
   postgresql://neondb_owner:xxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

3. 拆成 Spring 需要的 JDBC 配置：

   ```text
   DB_URL=jdbc:postgresql://ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   DB_USER=neondb_owner
   DB_PASSWORD=xxxx
   ```

   Neon 的连接串也可以直接改前缀为 `jdbc:postgresql://`，保留 `?sslmode=require`。

4. 不需要手工建表。API 第一次启动时 Flyway 会自动执行 `V1__init.sql`。

## 2. 在 Render 部署 API

1. Render 控制台 → **New → Web Service** → 连接 GitHub 仓库。
2. 配置：
   - Language：**Docker**
   - Root Directory：`apps/api`
   - Dockerfile Path：`Dockerfile`
   - Region：Singapore（或离你近的区域）
   - Instance Type：Free（体验）/ Starter（稳定）
   - Health Check Path：`/actuator/health`
3. 添加环境变量：

   ```text
   DB_URL=jdbc:postgresql://...neon.tech/neondb?sslmode=require
   DB_USER=neondb_owner
   DB_PASSWORD=...
   JWT_SECRET=<openssl rand -hex 32 的输出>
   ADMIN_EMAILS=you@example.com
   EXPOSE_DEV_CODE=false
   CORS_ORIGINS=https://<你的-pages-项目>.pages.dev
   PUBLIC_BASE_URL=https://<你的-api>.onrender.com
   MAIL_MODE=smtp
   MAIL_HOST=smtp.resend.com
   MAIL_PORT=587
   MAIL_USERNAME=resend
   MAIL_PASSWORD=<SMTP 密钥>
   MAIL_FROM=no-reply@your-domain.com
   MAIL_FROM_NAME=墨屿 MOYU
   STORAGE_PROVIDER=local
   DEMO_DATA=true
   ANALYTICS_TIMEZONE=Asia/Shanghai
   ANALYTICS_IP_SALT=<再生成一个随机串>
   SPRINGDOC_ENABLED=true
   ```

4. 点击 Deploy。第一次构建会下载 Maven 依赖，约 3–6 分钟。
5. 打开 `https://<api>.onrender.com/actuator/health`，看到 `{"status":"UP"}` 即成功。
6. 打开 `https://<api>.onrender.com/swagger-ui.html` 检查接口文档。
7. 如果使用自定义域名：Render → Settings → Custom Domains，添加 `api.example.com`，按提示在 Cloudflare 加 CNAME，等待证书签发。

> `DEMO_DATA=true` 只在文章表为空时插入 4 篇示例文章。正式写作后可以改回 `false`，不会删除已有内容。
> `STORAGE_PROVIDER=local` 时，Render 免费实例重启可能丢失上传文件；正式使用请切到 COS。

## 3. 在 Cloudflare Pages 部署前端

1. Cloudflare 控制台 → **Workers & Pages → Create → Pages → Connect to Git**。
2. 选择同一个 GitHub 仓库，配置：
   - Framework preset：Vite
   - Root directory：`apps/web`
   - Build command：`corepack enable && pnpm install --frozen-lockfile && pnpm build`
   - Build output directory：`dist`
   - 环境变量：

     ```text
     NODE_VERSION=22
     PNPM_VERSION=10.10.0
     VITE_API_BASE_URL=https://<api>.onrender.com
     VITE_BAIDU_TONGJI_ID=<可选>
     ```

3. 部署完成后会得到 `https://<project>.pages.dev`。
4. 回到 Render，把 `CORS_ORIGINS` 改成：

   ```text
   https://<project>.pages.dev,https://blog.example.com
   ```

   修改环境变量会触发 Render 重启。CORS 必须精确匹配协议 + 域名，不要带末尾 `/`。
5. 绑定自定义域名：Pages → Custom domains → 添加 `blog.example.com`，Cloudflare 会自动创建 CNAME 并签发证书。

## 4. 域名、SSL 与 CDN

### 4.1 域名接入 Cloudflare

1. 在域名注册商购买域名（阿里云、腾讯云、Namecheap 均可）。
2. Cloudflare → Add a site → 输入域名 → 选择 Free 计划。
3. 到注册商处把 NS 改成 Cloudflare 给的两个 nameserver。
4. 等待生效（通常几分钟到 24 小时）。

### 4.2 DNS 记录

| 类型 | 名称 | 内容 | 代理状态 |
| --- | --- | --- | --- |
| CNAME | `blog` | `<project>.pages.dev` | 已代理（橙色云） |
| CNAME | `api` | `<service>.onrender.com` | 已代理（橙色云） |
| CNAME | `cdn` | COS CDN 提供的加速域名 | 已代理（可选） |

如果 Cloudflare 与 Render 的证书链冲突，把 `api` 先设为 DNS only，等 Render 证书签发后再改回代理；SSL/TLS 模式选择 **Full (strict)**。

### 4.3 缓存规则（Cache Rules）

Cloudflare → Caching → Cache Rules：

| 优先级 | 匹配 | 策略 |
| --- | --- | --- |
| 1 | `http.request.uri.path starts with "/api/"` | Bypass cache |
| 2 | `http.request.uri.path starts with "/assets/"` | Cache eligible，Edge TTL 1 年，Browser TTL 1 年 |
| 3 | `http.request.uri.path starts with "/covers/"` | Cache eligible，Edge TTL 30 天 |
| 4 | `http.request.uri.path starts with "/uploads/"` | Cache eligible，Edge TTL 1 年 |
| 5 | `http.request.uri.path eq "/"` | 不缓存 HTML，或 Edge TTL 很短 |

原则：**带内容哈希的静态资源长缓存，HTML 不长期缓存，API 不缓存**。发布新版本后 HTML 会引用新的 `assets/index-<hash>.js`，旧缓存自然失效。

### 4.4 安全头

Caddy / Nginx 已设置 HSTS、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。Cloudflare 侧可以再加一条 Transform Rule 统一补充，但不要重复设置冲突的 HSTS。

## 5. 腾讯云 COS + CDN（图片上云）

1. 腾讯云控制台 → 对象存储 → 创建存储桶：
   - 地域：离用户近的，如 `ap-guangzhou`
   - 访问权限：**公有读私有写**（博客图片需要公开访问）
   - 记录 Bucket 名称，如 `moyu-1250000000`
2. 访问管理 CAM → 新建子用户 → 只授予该桶的 `PutObject`、`GetObject`、`DeleteObject` 权限，生成 SecretId / SecretKey。**不要用主账号密钥。**
3. 在 Render 修改：

   ```text
   STORAGE_PROVIDER=cos
   COS_SECRET_ID=...
   COS_SECRET_KEY=...
   COS_REGION=ap-guangzhou
   COS_BUCKET=moyu-1250000000
   COS_CDN_DOMAIN=
   ```

4. 先不配 CDN 也可以，URL 会是：

   ```text
   https://moyu-1250000000.cos.ap-guangzhou.myqcloud.com/2026/11/xxx.webp
   ```

5. 配 CDN：
   - COS 桶 → 域名与传输管理 → 自定义 CDN 加速域名 → 添加 `cdn.example.com`
   - 按提示在 Cloudflare / DNS 添加 CNAME
   - 开启 HTTPS，证书可用腾讯云免费证书
   - 缓存配置：`/2026/*` 等图片路径缓存 30 天以上，忽略参数
6. 把 `COS_CDN_DOMAIN=https://cdn.example.com` 填回 Render。新上传的图片会直接返回 CDN 地址。
7. Bucket CORS（为将来浏览器直传预留）：

   ```text
   Origin: https://blog.example.com
   Methods: GET, HEAD, PUT
   Headers: *
   Expose: ETag
   ```

> 当前代码是「服务端中转上传」。COS 密钥只存在 API 环境变量里，不会到浏览器。若以后改成预签名直传，再开放 PUT CORS。

## 6. 邮件验证码

生产必须使用真实 SMTP，否则登录页拿不到验证码。

### Resend（海外，配置简单）

```text
MAIL_MODE=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=587
MAIL_USERNAME=resend
MAIL_PASSWORD=re_xxxxxxxx
MAIL_FROM=no-reply@your-domain.com
```

在 Resend 验证发件域名，添加 SPF/DKIM DNS 记录。

### 阿里云邮件推送（国内）

```text
MAIL_MODE=smtp
MAIL_HOST=smtpdm.aliyun.com
MAIL_PORT=587
MAIL_USERNAME=<发信地址>
MAIL_PASSWORD=<SMTP 密码>
MAIL_FROM=<发信地址>
```

在阿里云控制台配置发信域名、SPF/DKIM，并申请发信地址。国内邮件到达率更依赖域名信誉，先小批量测试。

> 端口 587 使用 STARTTLS；当前配置没有开启 465 的隐式 SSL。若服务商只给 465，需要把 `spring.mail.properties.mail.smtp.ssl.enable` 设为 `true` 并关闭 starttls。

## 7. 极验 v4

1. 注册 [极验](https://www.geetest.com/)，创建「行为验证 4.0」应用。
2. 记录 Captcha ID 和 Captcha Key，配置应用域名。
3. Render 环境变量：

   ```text
   GEETEST_ENABLED=true
   GEETEST_CAPTCHA_ID=...
   GEETEST_CAPTCHA_KEY=...
   ```

4. 前端会自动请求 `/api/auth/captcha/config`，开启后登录页加载 `gt4.js`，完成验证后才请求验证码。
5. 验证失败或极验服务不可用时，后端不会发送邮件。

## 8. 百度统计

1. 登录 [百度统计](https://tongji.baidu.com/)，新增网站，复制 `hm.js?` 后面的 ID。
2. Cloudflare Pages 环境变量加 `VITE_BAIDU_TONGJI_ID=<id>`，重新部署。
3. 页面路由变化会调用 `_hmt.push(['_trackPageview', path])`；后台页面不加载。
4. 自有 PV/UV 仍由 `/api/analytics/collect` 记录，两边口径不同：
   - 百度统计：来源、地域、实时访客、广告效果。
   - 第一方：自己的数据库，可自由查询、导出、做产品决策。

## 9. GitHub Actions 自动部署 + 飞书

### 9.1 创建飞书机器人

1. 飞书群 → 设置 → 群机器人 → 添加机器人 → 自定义机器人。
2. 安全设置选「自定义关键词」，填 `MOYU`（通知标题含此词）。
3. 复制 Webhook URL。

### 9.2 GitHub 变量与密钥

仓库 → Settings → Secrets and variables → Actions。

**Variables：**

```text
DEPLOY_TARGET=paas
SITE_URL=https://blog.example.com
API_BASE_URL=https://<api>.onrender.com
CF_PAGES_PROJECT=<pages 项目名>
BAIDU_TONGJI_ID=<可选>
```

**Secrets：**

```text
CLOUDFLARE_API_TOKEN=<Pages:Edit 权限>
CLOUDFLARE_ACCOUNT_ID=<Cloudflare 账户 ID>
RENDER_DEPLOY_HOOK=<Render → Settings → Deploy Hook>
FEISHU_WEBHOOK=<飞书机器人 Webhook>
```

### 9.3 关闭平台自动部署，交给 GitHub Actions

- Render：Settings → Auto-Deploy → Off。
- Cloudflare Pages：Settings → Builds & deployments → 关闭自动部署（或保留，但会与工作流重复）。

之后每次 push 到 `main`：

1. `CI` 工作流：Java 测试 + 前端构建。
2. `CI` 成功后触发 `Deploy PaaS`：
   - 构建前端并上传 Cloudflare Pages。
   - 调 Render Deploy Hook 重建 API。
   - 轮询 `/actuator/health` 最多 5 分钟。
   - 发飞书卡片。
3. 如果失败，飞书卡片为红色，并带流水线链接。

### 9.4 第一次触发

在 Actions 里手动运行 **Deploy PaaS**，或 push 一次空提交：

```bash
git commit --allow-empty -m "chore: trigger deploy"
git push origin main
```

## 10. 上线验收清单

- [ ] `https://blog.example.com` 打开是博客首页，浏览器地址栏是锁。
- [ ] `https://api.example.com/actuator/health` 返回 `UP`。
- [ ] `https://api.example.com/swagger-ui.html` 可访问。
- [ ] 登录页能收到真实邮件验证码，`EXPOSE_DEV_CODE=false` 时页面不显示验证码。
- [ ] 后台新建文章、上传封面成功，图片 URL 是 COS/CDN 域名。
- [ ] 公开文章页刷新后阅读量增加，后台 PV/UV 增加。
- [ ] 百度统计「实时访客」能看到自己。
- [ ] 故意提交一个失败测试，飞书收到红色卡片；修复后收到绿色卡片。
- [ ] 手机 4G 网络访问正常，页面无横向滚动。

## 11. 常见问题

**CORS 报错**
`CORS_ORIGINS` 必须是完整的 `https://域名`，多个用英文逗号分隔，不能有末尾斜杠。

**登录一直提示验证码无效**
检查 `MAIL_MODE=smtp`、SMTP 密码、发件域名 SPF/DKIM；查看 Render Logs 里是否有 `MailSendException`。

**上传 502 / 500**
检查 COS SecretId/SecretKey 是否有该桶权限，Bucket 名称是否包含 APPID 后缀，Region 是否正确。

**Render 第一次请求很慢**
免费实例休眠，属正常现象。升级 Starter 或改用服务器路线。

**Page 刷新 404**
Cloudflare Pages 需要 SPA 回退。仓库 `apps/web` 的 Vite 构建产物是 SPA；在 Pages 设置里确认未启用严格静态路由，或添加 `_redirects`：

```text
/* /index.html 200
```

**数据库连接超时**
Neon 免费项目会休眠；首次连接可能慢几秒。确认 JDBC URL 带 `sslmode=require`，且 Render 与 Neon 区域尽量靠近。

**自定义域名证书一直 Pending**
先把 Cloudflare 代理关掉（DNS only），等 Render/Pages 签发证书，再打开代理并把 SSL 模式设为 Full (strict)。
