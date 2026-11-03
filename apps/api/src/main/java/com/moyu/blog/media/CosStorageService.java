package com.moyu.blog.media;

import com.moyu.blog.common.ApiException;
import com.moyu.blog.config.AppProperties;
import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.region.Region;
import jakarta.annotation.PreDestroy;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "cos")
public class CosStorageService implements StorageService {

    private final COSClient client;
    private final AppProperties.Storage.Cos config;

    public CosStorageService(AppProperties properties) {
        this.config = properties.storage().cos();
        if (isBlank(config.secretId()) || isBlank(config.secretKey())
                || isBlank(config.region()) || isBlank(config.bucket())) {
            throw new IllegalStateException(
                    "COS storage requires COS_SECRET_ID, COS_SECRET_KEY, COS_REGION and COS_BUCKET");
        }
        COSCredentials credentials = new BasicCOSCredentials(config.secretId(), config.secretKey());
        ClientConfig clientConfig = new ClientConfig(new Region(config.region()));
        this.client = new COSClient(credentials, clientConfig);
    }

    @Override
    public StoredObject store(byte[] bytes, String originalName, String contentType) {
        String key = StorageSupport.objectKey(originalName, contentType);
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(bytes.length);
        metadata.setContentType(contentType == null ? "application/octet-stream" : contentType);
        metadata.setCacheControl("public, max-age=31536000, immutable");
        try {
            client.putObject(config.bucket(), key, new ByteArrayInputStream(bytes), metadata);
            String base = isBlank(config.cdnDomain())
                    ? "https://" + config.bucket() + ".cos." + config.region() + ".myqcloud.com"
                    : config.cdnDomain();
            String url = base.replaceAll("/+$", "") + "/" + key.replaceAll("^/+", "");
            return new StoredObject(key, url, bytes.length);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "COS_UPLOAD_FAILED", "对象存储上传失败，请稍后重试");
        }
    }

    @Override
    public void delete(String key) {
        try {
            client.deleteObject(config.bucket(), key);
        } catch (Exception ignored) {
            // 删除失败不阻断数据库清理
        }
    }

    @PreDestroy
    void shutdown() {
        client.shutdown();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
