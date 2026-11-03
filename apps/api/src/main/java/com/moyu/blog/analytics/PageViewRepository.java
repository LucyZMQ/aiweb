package com.moyu.blog.analytics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PageViewRepository extends JpaRepository<PageView, UUID> {

    long countByCreatedAtAfter(Instant from);

    @Query("select count(distinct p.visitorId) from PageView p where p.createdAt >= :from")
    long countUniqueVisitorsSince(@Param("from") Instant from);

    @Query(value = """
            select to_char(timezone(:tz, created_at), 'YYYY-MM-DD') as day,
                   count(*) as pv,
                   count(distinct visitor_id) as uv
            from page_views
            where created_at >= :from
            group by 1
            order by 1
            """, nativeQuery = true)
    List<Object[]> dailySeries(@Param("from") Instant from, @Param("tz") String timezone);

    @Query(value = """
            select path, count(*) as pv
            from page_views
            where created_at >= :from
            group by path
            order by pv desc
            limit 8
            """, nativeQuery = true)
    List<Object[]> topPages(@Param("from") Instant from);
}
