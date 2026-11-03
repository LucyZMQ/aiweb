package com.moyu.blog.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Auth auth,
        Cors cors,
        Geetest geetest,
        Storage storage,
        Mail mail,
        Analytics analytics,
        boolean demoData
) {

    public record Auth(
            String jwtSecret,
            Duration tokenTtl,
            List<String> adminEmails,
            boolean exposeDevCode,
            Duration codeTtl
    ) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Geetest(
            boolean enabled,
            String captchaId,
            String captchaKey,
            String verifyUrl
    ) {
    }

    public record Storage(
            String provider,
            String localDir,
            String publicBaseUrl,
            Cos cos
    ) {
        public record Cos(
                String secretId,
                String secretKey,
                String region,
                String bucket,
                String cdnDomain
        ) {
        }
    }

    public record Mail(
            String mode,
            String fromName,
            String fromAddress
    ) {
    }

    public record Analytics(String timezone, String ipSalt) {
    }
}
