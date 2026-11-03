package com.moyu.blog.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PostDtos {

    private PostDtos() {
    }

    public record PostSummary(
            UUID id,
            String slug,
            String title,
            String excerpt,
            String coverUrl,
            List<String> tags,
            String status,
            Instant publishedAt,
            Instant updatedAt,
            long viewCount,
            int readingMinutes
    ) {
    }

    public record PostDetail(
            UUID id,
            String slug,
            String title,
            String excerpt,
            String content,
            String coverUrl,
            List<String> tags,
            String status,
            Instant publishedAt,
            Instant createdAt,
            Instant updatedAt,
            long viewCount,
            int readingMinutes
    ) {
    }

    public record PostRequest(
            @NotBlank(message = "标题不能为空") @Size(max = 200, message = "标题最多 200 字") String title,
            @Size(max = 160, message = "slug 最多 160 字") String slug,
            @NotBlank(message = "摘要不能为空") @Size(max = 400, message = "摘要最多 400 字") String excerpt,
            @NotBlank(message = "正文不能为空") @Size(max = 100000, message = "正文过长") String content,
            @Size(max = 1000, message = "封面地址过长") String coverUrl,
            @Size(max = 5, message = "最多 5 个标签") List<@Size(max = 30, message = "单个标签最多 30 字") String> tags,
            @NotNull(message = "请选择文章状态") PostStatus status
    ) {
    }

    public record PostPage(List<PostSummary> items, int page, int size, long total, int totalPages) {
    }

    public record SiteStats(long posts, long views, Instant lastUpdated, List<String> tags) {
    }
}
