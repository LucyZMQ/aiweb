package com.moyu.blog.analytics;

import com.moyu.blog.common.RequestUtils;
import com.moyu.blog.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private final PageViewRepository repository;
    private final AppProperties.Analytics config;
    private final ZoneId zone;

    public AnalyticsService(PageViewRepository repository, AppProperties properties) {
        this.repository = repository;
        this.config = properties.analytics();
        this.zone = ZoneId.of(config.timezone());
    }

    @Transactional
    public void collect(AnalyticsDtos.CollectRequest request, HttpServletRequest httpRequest) {
        String path = request.path().trim();
        if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api/")) {
            return;
        }
        String userAgent = httpRequest.getHeader("User-Agent");
        repository.save(new PageView(
                truncate(path, 500),
                truncate(request.referrer(), 1000),
                truncate(request.visitorId(), 64),
                truncate(request.sessionId(), 64),
                truncate(userAgent, 500),
                hashIp(RequestUtils.clientIp(httpRequest))
        ));
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.Overview overview(int requestedDays) {
        int days = Math.min(90, Math.max(1, requestedDays));
        LocalDate startDate = LocalDate.now(zone).minusDays(days - 1L);
        Instant from = startDate.atStartOfDay(zone).toInstant();

        long pv = repository.countByCreatedAtAfter(from);
        long uv = repository.countUniqueVisitorsSince(from);

        List<AnalyticsDtos.DailyPoint> series = new ArrayList<>();
        Map<String, long[]> byDay = new HashMap<>();
        for (Object[] row : repository.dailySeries(from, config.timezone())) {
            String day = String.valueOf(row[0]);
            byDay.put(day, new long[]{((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        for (int i = 0; i < days; i++) {
            String day = startDate.plusDays(i).toString();
            long[] values = byDay.getOrDefault(day, new long[]{0, 0});
            series.add(new AnalyticsDtos.DailyPoint(day, values[0], values[1]));
        }

        List<AnalyticsDtos.TopPage> topPages = repository.topPages(from).stream()
                .map(row -> new AnalyticsDtos.TopPage(String.valueOf(row[0]),
                        ((Number) row[1]).longValue()))
                .toList();

        double average = Math.round((double) pv / days * 10.0) / 10.0;
        return new AnalyticsDtos.Overview(days, pv, uv, average, series, topPages);
    }

    private String hashIp(String ip) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(config.ipSalt().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(ip.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            return null;
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
