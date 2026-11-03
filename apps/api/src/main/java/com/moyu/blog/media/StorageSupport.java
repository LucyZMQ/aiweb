package com.moyu.blog.media;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;

final class StorageSupport {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif", "avif", "svg");

    private StorageSupport() {
    }

    static String objectKey(String originalName, String contentType) {
        String date = DateTimeFormatter.ofPattern("yyyy/MM").format(ZonedDateTime.now(ZoneOffset.UTC));
        return date + "/" + java.util.UUID.randomUUID() + "." + extension(originalName, contentType);
    }

    static String extension(String originalName, String contentType) {
        if (originalName != null) {
            int dot = originalName.lastIndexOf('.');
            if (dot >= 0 && dot < originalName.length() - 1) {
                String ext = originalName.substring(dot + 1).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
                if (IMAGE_EXTENSIONS.contains(ext)) {
                    return ext;
                }
            }
        }
        return switch (contentType == null ? "" : contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            case "image/avif" -> "avif";
            case "image/svg+xml" -> "svg";
            default -> "jpg";
        };
    }

    static String joinUrl(String base, String key) {
        if (base == null || base.isBlank()) {
            return "/uploads/" + key;
        }
        return base.replaceAll("/+$", "") + "/uploads/" + key.replaceAll("^/+", "");
    }
}
