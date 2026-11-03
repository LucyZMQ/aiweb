package com.moyu.blog.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record EmailCodeRequest(
            @NotBlank(message = "请输入邮箱") @Email(message = "邮箱格式不正确") String email,
            CaptchaPayload captcha
    ) {
    }

    public record LoginRequest(
            @NotBlank(message = "请输入邮箱") @Email(message = "邮箱格式不正确") String email,
            @NotBlank(message = "请输入验证码") String code
    ) {
    }

    public record EmailCodeResponse(String message, long expiresInSeconds, String devCode) {
    }

    public record LoginResponse(String token, Instant expiresAt, UserView user) {
    }

    public record UserView(UUID id, String email, String displayName, String role) {
    }

    public record CaptchaConfig(boolean enabled, String captchaId) {
    }
}
