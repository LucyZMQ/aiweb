package com.moyu.blog.analytics;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record CollectRequest(
            @NotBlank(message = "path 不能为空") @Size(max = 500) String path,
            @Size(max = 1000) String referrer,
            @NotBlank(message = "visitorId 不能为空") @Size(max = 64) String visitorId,
            @Size(max = 64) String sessionId
    ) {
    }

    public record DailyPoint(String date, long pv, long uv) {
    }

    public record TopPage(String path, long pv) {
    }

    public record Overview(
            int days,
            long pageViews,
            long uniqueVisitors,
            double avgPerDay,
            List<DailyPoint> series,
            List<TopPage> topPages
    ) {
    }
}
