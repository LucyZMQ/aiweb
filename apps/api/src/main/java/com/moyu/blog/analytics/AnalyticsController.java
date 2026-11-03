package com.moyu.blog.analytics;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "数据埋点", description = "第一方 PV/UV 采集与后台统计")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @PostMapping("/analytics/collect")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "采集一次页面浏览", description = "前端在公开页面路由变化时调用，后台路径不会被记录")
    public void collect(@Valid @RequestBody AnalyticsDtos.CollectRequest request, HttpServletRequest httpRequest) {
        analyticsService.collect(request, httpRequest);
    }

    @GetMapping("/admin/analytics/overview")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "后台 PV/UV 概览", description = "返回按天序列与热门页面，最多 90 天")
    public AnalyticsDtos.Overview overview(@RequestParam(defaultValue = "14") int days) {
        return analyticsService.overview(days);
    }
}
