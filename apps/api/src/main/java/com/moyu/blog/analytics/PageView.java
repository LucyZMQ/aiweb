package com.moyu.blog.analytics;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "page_views")
public class PageView {

    @Id
    private UUID id;

    @Column(nullable = false, length = 500)
    private String path;

    @Column(length = 1000)
    private String referrer;

    @Column(name = "visitor_id", nullable = false, length = 64)
    private String visitorId;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PageView() {
    }

    public PageView(String path, String referrer, String visitorId, String sessionId, String userAgent, String ipHash) {
        this.id = UUID.randomUUID();
        this.path = path;
        this.referrer = referrer;
        this.visitorId = visitorId;
        this.sessionId = sessionId;
        this.userAgent = userAgent;
        this.ipHash = ipHash;
        this.createdAt = Instant.now();
    }
}
