# 7 天体验路线

如果你不是想「看完」，而是想真正体验一遍「用 AI 做一个项目并上线」，按这个顺序做。每天 1–2 小时，遇到卡点就把报错贴给 AI。

## Day 0 · 先让它在本地跑起来

```bash
./scripts/setup-local.sh
./scripts/dev.sh
```

验收：

- [ ] 首页能打开。
- [ ] `admin@moyu.local` 能登录（验证码显示在页面上）。
- [ ] 能发一篇草稿。
- [ ] Swagger 能打开。

这一步不需要任何云账号。**先在本地建立确定感，再碰云。**

## Day 1 · 账号与域名

- [ ] 注册 GitHub、Cloudflare、Neon、Render。
- [ ] 买一个域名，NS 接入 Cloudflare。
- [ ] 注册一个 SMTP 服务（Resend 或阿里云邮件推送）。
- [ ] 决定先用 `*.pages.dev` / `*.onrender.com`，还是直接上自定义域名。

验收：域名在 Cloudflare 显示 Active。

## Day 2 · 把 API 和数据库放到公网

- [ ] Neon 建库，拿到 JDBC URL。
- [ ] Render 用 `apps/api/Dockerfile` 建 Web Service。
- [ ] 配好 `DB_*`、`JWT_SECRET`、`ADMIN_EMAILS`、`CORS_ORIGINS`、SMTP。
- [ ] `/actuator/health` 返回 `UP`。

验收：Swagger 在公网可访问；用 `curl` 能发验证码、登录。

## Day 3 · 把前端放上去

- [ ] Cloudflare Pages 连接仓库，Root `apps/web`。
- [ ] `VITE_API_BASE_URL` 指向 Render。
- [ ] 登录、发文、上传全部走一遍。
- [ ] 绑定 `blog.example.com`，确认 HTTPS 锁。

验收：手机 4G 能打开；后台能登录；文章能发布。

## Day 4 · 把图片搬到 COS

- [ ] 腾讯云 COS 建桶，创建最小权限子账号。
- [ ] Render 配 `STORAGE_PROVIDER=cos` 和 COS 密钥。
- [ ] 后台上传封面，确认 URL 是 COS 域名。
- [ ] 配 CDN 自定义域名，回填 `COS_CDN_DOMAIN`。
- [ ] Cloudflare/腾讯云配缓存规则。

验收：上传 5 张图，刷新、重启后都能访问；服务器磁盘不增长。

## Day 5 · 登录安全与极验

- [ ] 极验申请 Captcha ID / Key。
- [ ] 配 `GEETEST_ENABLED=true`。
- [ ] 关闭 `EXPOSE_DEV_CODE`。
- [ ] 用错误验证码试 5 次，确认被锁定。
- [ ] 用未授权邮箱访问 `/api/admin/posts`，确认 403。

验收：登录必须过人机验证；页面不再显示验证码；非管理员进不了后台。

## Day 6 · CI/CD 与飞书

- [ ] 建飞书群机器人，关键词 `MOYU`。
- [ ] GitHub Variables：`DEPLOY_TARGET=paas`（或 `server`）。
- [ ] GitHub Secrets：Cloudflare / Render / 飞书。
- [ ] 改一行文案，push `main`。
- [ ] 看 Actions 全绿，飞书收到绿色卡片。
- [ ] 故意让测试失败，确认飞书红色卡片。

验收：一次提交自动完成构建、部署、通知，全程不手工登录服务器。

## Day 7 · 观测与收尾

- [ ] 百度统计能看到实时访客。
- [ ] 后台 PV/UV 有数据。
- [ ] 配数据库每日备份（服务器路线）。
- [ ] 跑一次回滚。
- [ ] 写一篇「这个站是怎么上线的」文章，发布。

验收：你有一篇真实文章、一条真实访问曲线、一次真实发布记录。

## 如果你只有 30 分钟

只做三件事：

1. 本地跑起来并发一篇文章。
2. Render + Neon 把 API 放上公网。
3. Cloudflare Pages 放前端。

先体验「上线」的完整闭环，再补 COS、极验、CI/CD。不要第一天就同时开十个云服务控制台。

## 常见卡点

| 卡点 | 先看 |
| --- | --- |
| CORS | `CORS_ORIGINS` 是否精确匹配前端域名 |
| 登录没邮件 | `MAIL_MODE`、SMTP 密码、垃圾箱、SPF/DKIM |
| Render 冷启动 | 免费实例休眠，等 60 秒 |
| 上传 403 | COS 子账号权限、Bucket、Region |
| HTTPS 证书 | DNS 是否指向、80 端口、Cloudflare 代理 |
| 部署红灯 | Actions 日志 → Render/服务器日志 → 健康检查 |
| 数据库连不上 | JDBC URL、`sslmode=require`、区域、密码 |

---

做完这 7 天，你收获的不是一个「能打开的页面」，而是一条可重复的路径：**本地验证 → 云端部署 → 真实登录 → 对象存储 → 自动化发布 → 观测数据**。下一次做别的项目，只是换领域模型。
