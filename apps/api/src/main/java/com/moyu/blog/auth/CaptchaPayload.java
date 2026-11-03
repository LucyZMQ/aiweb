package com.moyu.blog.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "极验第四代验证结果，未启用极验时可为空")
public record CaptchaPayload(
        @JsonAlias("lot_number") String lotNumber,
        @JsonAlias("captcha_output") String captchaOutput,
        @JsonAlias("pass_token") String passToken,
        @JsonAlias("gen_time") String genTime
) {
}
