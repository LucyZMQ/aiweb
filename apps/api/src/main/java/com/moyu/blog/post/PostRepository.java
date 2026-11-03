package com.moyu.blog.post;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {

    Optional<Post> findBySlug(String slug);

    Optional<Post> findBySlugAndStatus(String slug, PostStatus status);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    long countByStatus(PostStatus status);

    @Query("""
            select p from Post p
            where p.status = :status
              and (:q = '' or lower(p.title) like lower(concat('%', :q, '%'))
                   or lower(p.excerpt) like lower(concat('%', :q, '%')))
              and (:tag = '' or lower(p.tags) like lower(concat('%', :tag, '%')))
            order by p.publishedAt desc
            """)
    Page<Post> searchPublished(@Param("status") PostStatus status,
                               @Param("q") String q,
                               @Param("tag") String tag,
                               Pageable pageable);

    @Query("""
            select p from Post p
            where (:status is null or p.status = :status)
              and (:q = '' or lower(p.title) like lower(concat('%', :q, '%'))
                   or lower(p.slug) like lower(concat('%', :q, '%')))
            order by p.updatedAt desc
            """)
    Page<Post> searchAdmin(@Param("status") PostStatus status,
                           @Param("q") String q,
                           Pageable pageable);

    @Query("select coalesce(sum(p.viewCount), 0) from Post p where p.status = :status")
    long sumViews(@Param("status") PostStatus status);

    @Query("select distinct p.tags from Post p where p.status = :status")
    List<List<String>> findTagLists(@Param("status") PostStatus status);

    List<Post> findTop4ByStatusOrderByPublishedAtDesc(PostStatus status);

    List<Post> findTop5ByOrderByUpdatedAtDesc();
}
