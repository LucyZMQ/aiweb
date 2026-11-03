package com.moyu.blog.media;

import java.time.Instant;
import java.util.UUID;

public final class MediaDtos {

    private MediaDtos() {
    }

    public record MediaView(
            UUID id,
            String url,
            String objectKey,
            String originalName,
            String contentType,
            long sizeBytes,
            Instant createdAt
    ) {
    }
}
