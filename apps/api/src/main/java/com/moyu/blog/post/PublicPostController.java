package com.moyu.blog.post;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
@Tag(name = "公开文章", description = "无需登录的博客内容接口")
public class PublicPostController {

    private final PostService postService;

    public PublicPostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping("/posts")
    @Operation(summary = "文章列表", description = "支持关键词、标签筛选与分页")
    public PostDtos.PostPage list(@RequestParam(required = false) String q,
                                  @RequestParam(required = false) String tag,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "9") int size) {
        return postService.listPublic(q, tag, page, size);
    }

    @GetMapping("/posts/{slug}")
    @Operation(summary = "文章详情", description = "按 slug 获取已发布文章，并累计阅读量")
    public PostDtos.PostDetail detail(@PathVariable String slug) {
        return postService.getPublic(slug);
    }

    @GetMapping("/stats")
    @Operation(summary = "站点统计", description = "文章数、阅读量与标签，用于首页展示")
    public PostDtos.SiteStats stats() {
        return postService.siteStats();
    }
}
