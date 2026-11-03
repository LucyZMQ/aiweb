package com.moyu.blog.config;

import com.moyu.blog.post.Post;
import com.moyu.blog.post.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class DemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final PostRepository posts;
    private final AppProperties properties;

    public DemoDataInitializer(PostRepository posts, AppProperties properties) {
        this.posts = posts;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.demoData() || posts.count() > 0) {
            return;
        }
        List<Post> demo = List.of(
                post("small-systems-clear-boundaries",
                        "把系统做小，把边界做清楚",
                        "真正让项目变复杂的，通常不是功能太少，而是每条边界都含糊。一次关于模块、数据与部署边界的整理。",
                        "/covers/boundaries.svg",
                        List.of("架构", "工程"),
                        18,
                        """
                                # 把系统做小，把边界做清楚

                                我们常常把「做一个博客」想得太轻，又把「做一个系统」想得太重。真正值得练习的，是在两者之间找到一条清晰的边界。

                                > 好的架构不是把所有可能都提前实现，而是让下一次修改只发生在一个地方。

                                ## 三条边界

                                1. **领域边界**：文章、用户、素材、埋点，各自拥有数据与规则。
                                2. **部署边界**：前端是静态文件，后端是无状态容器，数据库是有状态服务。
                                3. **团队边界**：一次提交只解决一个可描述的问题，流水线负责把结果送到线上。

                                ## 一个最小但完整的后端

                                ```java
                                @RestController
                                class PublicPostController {
                                    @GetMapping("/api/public/posts/{slug}")
                                    PostDetail detail(@PathVariable String slug) {
                                        return postService.getPublic(slug);
                                    }
                                }
                                ```

                                这个项目里，后端只做四件事：认证、内容、素材、统计。其余的复杂度，都留给基础设施。

                                ## 为什么先做减法

                                每多一个依赖，就多一个需要升级、监控和解释的东西。先把边界画出来，再决定哪些能力值得进入边界内部。

                                - 登录不自己存密码，直接用邮箱验证码。
                                - 图片不在应用服务器上长期堆积，切换到对象存储。
                                - 统计数据先落到自己的数据库，再考虑第三方平台。

                                ## 留一个出口

                                边界不是墙。对象存储可以从本地磁盘切换，邮件可以从日志切换到 SMTP，CDN 可以从直连切换到边缘节点。**可替换**，比「一开始就完美」更重要。
                                """),
                post("a-quiet-release",
                        "一次安静的发布：从提交到上线的 9 分钟",
                        "没有紧张的手工操作，也没有「谁在服务器上改了什么」。记录一条从 git push 到飞书通知的发布链路。",
                        "/covers/release.svg",
                        List.of("CI/CD", "云"),
                        11,
                        """
                                # 一次安静的发布

                                理想的上线应该像一次深呼吸：提交、等待、收到通知，然后继续写下一行代码。

                                ## 链路

                                ```text
                                git push
                                  → GitHub Actions / 云效流水线
                                  → 单元测试 + 前端构建
                                  → 构建镜像并推送 GHCR
                                  → SSH 到服务器 docker compose pull/up
                                  → 健康检查
                                  → 飞书群机器人通知
                                ```

                                ## 让发布可回滚

                                镜像使用 commit SHA 作为 tag，服务器上的 `docker-compose.yml` 只引用版本，不引用 `latest`。回滚不是「重新构建一次」，而是把版本号改回去。

                                ## 健康检查

                                ```bash
                                curl --fail --silent https://blog.example.com/actuator/health
                                ```

                                只有健康检查通过，飞书才发送绿色卡片；失败则发送红色卡片并带上日志链接。

                                ## 发布不是终点

                                上线之后，真正开始的是观察：PV/UV 是否异常、接口延迟是否上升、对象存储是否产生意外流量。发布流水线应该把「可观察」当成交付物的一部分。
                                """),
                post("a-dashboard-for-the-blog",
                        "给博客加上一盏仪表盘",
                        "第三方统计告诉你发生了什么，第一方埋点让你知道为什么。一次关于 PV、UV 与隐私边界的实践。",
                        "/covers/dashboard.svg",
                        List.of("数据", "设计"),
                        7,
                        """
                                # 给博客加上一盏仪表盘

                                仪表盘不是为了制造更多数字，而是为了在写下一篇文章时，知道读者从哪里来、在哪里停留。

                                ## 两套数据，各司其职

                                - **第一方埋点**：记录路径、来源、匿名访客 ID，落到自己的 PostgreSQL。
                                - **百度统计**：提供成熟的来源分析、地域分布和实时访客能力。

                                ```sql
                                select to_char(timezone('Asia/Shanghai', created_at), 'YYYY-MM-DD') as day,
                                       count(*) as pv,
                                       count(distinct visitor_id) as uv
                                from page_views
                                group by 1
                                order by 1;
                                ```

                                ## 隐私的底线

                                不存原始 IP，只存加盐哈希；不采集输入内容；提供关闭入口。数据够用就好。

                                ## 设计上的克制

                                一张折线图、三个数字、一个热门页面列表，已经足够回答大多数问题。剩下的，留给好奇心。
                                """),
                post("room-in-the-edge-cache",
                        "在边缘缓存里，留一点余地",
                        "CDN 不是「打开开关」就结束。缓存键、回源、失效策略，决定了它是加速器还是故障放大器。",
                        "/covers/edge.svg",
                        List.of("CDN", "性能"),
                        9,
                        """
                                # 在边缘缓存里，留一点余地

                                当用户分布在不同的城市，距离就变成了体验的一部分。CDN 把内容放到离用户更近的地方，但它也会把错误一起放大。

                                ## 哪些该缓存

                                | 资源 | 策略 |
                                | --- | --- |
                                | `/assets/*` | 一年，immutable |
                                | `/covers/*` | 三十天 |
                                | `/api/*` | 不缓存，或仅缓存公开 GET |
                                | `/uploads/*` | 一年，immutable |

                                ## 缓存键要稳定

                                带随机查询参数的图片 URL 会让缓存命中率归零。上传时生成稳定的对象键，发布后不再改变。

                                ## 失效要可控

                                静态资源用内容哈希命名，发布新版本即自然失效；HTML 不长期缓存，保证用户能拿到新的入口。

                                ## 回源要留余地

                                给回源设置超时与重试上限，给源站留出喘息的窗口。边缘节点很快，但源站只有一个。
                                """)
        );
        posts.saveAll(demo);
        log.info("Seeded {} demo posts", demo.size());
    }

    private static Post post(String slug, String title, String excerpt, String cover,
                             List<String> tags, int daysAgo, String content) {
        Post post = new Post(slug, title, excerpt, content);
        post.setCoverUrl(cover);
        post.setTags(tags);
        post.markPublished();
        post.setPublishedAt(Instant.now().minus(daysAgo, ChronoUnit.DAYS));
        return post;
    }
}
