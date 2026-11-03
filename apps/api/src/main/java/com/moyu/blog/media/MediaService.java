package com.moyu.blog.media;

import com.moyu.blog.common.ApiException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaService {

    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif");

    private final StorageService storageService;
    private final MediaRepository repository;
    private final String provider;

    public MediaService(StorageService storageService,
                        MediaRepository repository,
                        com.moyu.blog.config.AppProperties properties) {
        this.storageService = storageService;
        this.repository = repository;
        this.provider = properties.storage().provider();
    }

    @Transactional
    public MediaDtos.MediaView upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("请选择要上传的文件");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE,
                    "FILE_TOO_LARGE", "图片不能超过 10MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw ApiException.badRequest("仅支持 JPG、PNG、WebP、GIF、AVIF 图片");
        }
        try {
            byte[] bytes = file.getBytes();
            String originalName = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename();
            StorageService.StoredObject stored = storageService.store(bytes, originalName, contentType);
            MediaAsset asset = repository.save(new MediaAsset(
                    stored.key(), stored.url(), originalName, contentType, stored.size()));
            return toView(asset);
        } catch (IOException ex) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "UPLOAD_FAILED", "读取上传文件失败");
        }
    }

    @Transactional(readOnly = true)
    public List<MediaDtos.MediaView> list() {
        return repository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 60))
                .stream().map(MediaService::toView).toList();
    }

    @Transactional
    public void delete(UUID id) {
        MediaAsset asset = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("文件不存在"));
        storageService.delete(asset.getObjectKey());
        repository.delete(asset);
    }

    public String provider() {
        return provider;
    }

    private static MediaDtos.MediaView toView(MediaAsset asset) {
        return new MediaDtos.MediaView(asset.getId(), asset.getUrl(), asset.getObjectKey(),
                asset.getOriginalName(), asset.getContentType(), asset.getSizeBytes(), asset.getCreatedAt());
    }
}
