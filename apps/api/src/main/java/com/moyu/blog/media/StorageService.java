package com.moyu.blog.media;

public interface StorageService {

    StoredObject store(byte[] bytes, String originalName, String contentType);

    void delete(String key);

    record StoredObject(String key, String url, long size) {
    }
}
