package com.moyu.blog.auth;

import com.moyu.blog.common.ApiException;
import com.moyu.blog.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Service
public class GeetestService {

    private static final Logger log = LoggerFactory.getLogger(GeetestService.class);

    private final AppProperties.Geetest config;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeetestService(AppProperties properties, RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.config = properties.geetest();
        if (config.enabled() && (!StringUtils.hasText(config.captchaId())
                || !StringUtils.hasText(config.captchaKey()))) {
            throw new IllegalStateException(
                    "Geetest is enabled but GEETEST_CAPTCHA_ID / GEETEST_CAPTCHA_KEY are missing");
        }
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public boolean enabled() {
        return config.enabled();
    }

    public String captchaId() {
        return config.captchaId();
    }

    public void verify(CaptchaPayload payload, String clientIp) {
        if (!enabled()) {
            return;
        }
        if (payload == null
                || !StringUtils.hasText(payload.lotNumber())
                || !StringUtils.hasText(payload.captchaOutput())
                || !StringUtils.hasText(payload.passToken())
                || !StringUtils.hasText(payload.genTime())) {
            throw ApiException.badRequest("请先完成人机验证");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("lot_number", payload.lotNumber());
        form.add("captcha_output", payload.captchaOutput());
        form.add("pass_token", payload.passToken());
        form.add("gen_time", payload.genTime());
        form.add("sign_token", hmacSha256(payload.lotNumber(), config.captchaKey()));
        if (StringUtils.hasText(clientIp)) {
            form.add("ip", clientIp);
        }

        try {
            String raw = restClient.post()
                    .uri(config.verifyUrl() + "?captcha_id={id}", config.captchaId())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);
            JsonNode json = objectMapper.readTree(raw == null ? "{}" : raw);
            if (!"success".equals(json.path("result").asText())) {
                log.warn("Geetest rejected captcha: {}", json.path("reason").asText());
                throw ApiException.badRequest("人机验证未通过，请重试");
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Geetest verification call failed", ex);
            throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "CAPTCHA_UNAVAILABLE", "人机验证服务暂时不可用，请稍后重试");
        }
    }

    private static String hmacSha256(String value, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign Geetest payload", ex);
        }
    }
}
