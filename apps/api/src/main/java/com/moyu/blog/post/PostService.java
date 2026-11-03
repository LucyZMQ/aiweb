package com.moyu.blog.post;

import com.moyu.blog.common.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class PostService {

    private final PostRepository posts;

    public PostService(PostRepository posts) {
        this.posts = posts;
    }

    @Transactional(readOnly = true)
    public PostDtos.PostPage listPublic(String q, String tag, int page, int size) {
        Page<Post> result = posts.searchPublished(
                PostStatus.PUBLISHED,
                blankToEmpty(q),
                blankToEmpty(tag),
                PageRequest.of(clamp(page), clampSize(size), Sort.by(Sort.Direction.DESC, "publishedAt")));
        return toPage(result);
    }

    @Transactional
    public PostDtos.PostDetail getPublic(String slug) {
        Post post = posts.findBySlugAndStatus(slug, PostStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("文章不存在或尚未发布"));
        post.incrementView();
        posts.save(post);
        return toDetail(post);
    }

    @Transactional(readOnly = true)
    public PostDtos.PostPage listAdmin(String status, String q, int page, int size) {
        PostStatus parsed = null;
        if (status != null && !status.isBlank()) {
            try {
                parsed = PostStatus.valueOf(status.toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("未知的文章状态");
            }
        }
        Page<Post> result = posts.searchAdmin(parsed, blankToEmpty(q),
                PageRequest.of(clamp(page), clampSize(size), Sort.by(Sort.Direction.DESC, "updatedAt")));
        return toPage(result);
    }

    @Transactional(readOnly = true)
    public PostDtos.PostDetail getAdmin(UUID id) {
        return toDetail(find(id));
    }

    @Transactional
    public PostDtos.PostDetail create(PostDtos.PostRequest request) {
        Post post = new Post("temporary", request.title().trim(), request.excerpt().trim(), request.content());
        post.setSlug(uniqueSlug(slugSeed(request), null));
        apply(post, request);
        posts.save(post);
        return toDetail(post);
    }

    @Transactional
    public PostDtos.PostDetail update(UUID id, PostDtos.PostRequest request) {
        Post post = find(id);
        String requestedSlug = slugSeed(request);
        if (!post.getSlug().equals(requestedSlug)) {
            post.setSlug(uniqueSlug(requestedSlug, id));
        }
        apply(post, request);
        posts.save(post);
        return toDetail(post);
    }

    @Transactional
    public void delete(UUID id) {
        Post post = find(id);
        posts.delete(post);
    }

    @Transactional(readOnly = true)
    public PostDtos.SiteStats siteStats() {
        List<Post> published = posts.findTop4ByStatusOrderByPublishedAtDesc(PostStatus.PUBLISHED);
        Instant lastUpdated = published.stream()
                .map(Post::getUpdatedAt)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        Set<String> tags = new LinkedHashSet<>();
        for (List<String> list : posts.findTagLists(PostStatus.PUBLISHED)) {
            if (list != null) {
                tags.addAll(list);
            }
        }
        List<String> sortedTags = new ArrayList<>(tags);
        sortedTags.sort(String::compareToIgnoreCase);
        return new PostDtos.SiteStats(
                posts.countByStatus(PostStatus.PUBLISHED),
                posts.sumViews(PostStatus.PUBLISHED),
                lastUpdated,
                sortedTags.stream().limit(24).toList());
    }

    private void apply(Post post, PostDtos.PostRequest request) {
        post.setTitle(request.title().trim());
        post.setExcerpt(request.excerpt().trim());
        post.setContent(request.content());
        post.setCoverUrl(blankToNull(request.coverUrl()));
        post.setTags(normalizeTags(request.tags()));
        if (request.status() == PostStatus.PUBLISHED) {
            post.markPublished();
        } else {
            post.setStatus(PostStatus.DRAFT);
        }
    }

    private Post find(UUID id) {
        return posts.findById(id).orElseThrow(() -> ApiException.notFound("文章不存在"));
    }

    private String uniqueSlug(String seed, UUID excludeId) {
        String base = seed == null || seed.isBlank() ? "post-" + dateStamp() : slugify(seed);
        String candidate = base;
        int suffix = 2;
        while (posts.existsBySlug(candidate)
                && (excludeId == null || posts.existsBySlugAndIdNot(candidate, excludeId))) {
            candidate = base + "-" + suffix++;
            if (suffix > 100) {
                candidate = base + "-" + UUID.randomUUID().toString().substring(0, 6);
                break;
            }
        }
        return candidate;
    }

    private static String slugSeed(PostDtos.PostRequest request) {
        if (request.slug() != null && !request.slug().isBlank()) {
            return request.slug().trim();
        }
        return request.title();
    }

    static String slugify(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKD)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("[\\s-]+", "-")
                .replaceAll("^-+|-+$", "");
        if (normalized.isBlank()) {
            return "post-" + dateStamp();
        }
        return normalized.length() > 120 ? normalized.substring(0, 120) : normalized;
    }

    private static String dateStamp() {
        return DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC).format(Instant.now());
    }

    private static List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        Set<String> distinct = new LinkedHashSet<>();
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                distinct.add(tag.trim().replace("#", ""));
            }
            if (distinct.size() >= 5) {
                break;
            }
        }
        return new ArrayList<>(distinct);
    }

    private static PostDtos.PostPage toPage(Page<Post> page) {
        return new PostDtos.PostPage(
                page.getContent().stream().map(PostService::toSummary).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }

    private static PostDtos.PostSummary toSummary(Post post) {
        return new PostDtos.PostSummary(
                post.getId(), post.getSlug(), post.getTitle(), post.getExcerpt(), post.getCoverUrl(),
                post.getTags(), post.getStatus().name(), post.getPublishedAt(), post.getUpdatedAt(),
                post.getViewCount(), post.readingMinutes());
    }

    private static PostDtos.PostDetail toDetail(Post post) {
        return new PostDtos.PostDetail(
                post.getId(), post.getSlug(), post.getTitle(), post.getExcerpt(), post.getContent(),
                post.getCoverUrl(), post.getTags(), post.getStatus().name(), post.getPublishedAt(),
                post.getCreatedAt(), post.getUpdatedAt(), post.getViewCount(), post.readingMinutes());
    }

    private static String blankToEmpty(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static int clamp(int page) {
        return Math.max(0, page);
    }

    private static int clampSize(int size) {
        return Math.min(50, Math.max(1, size));
    }
}
