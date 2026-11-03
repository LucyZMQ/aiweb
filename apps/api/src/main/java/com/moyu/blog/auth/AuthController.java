package com.moyu.blog.auth;

import com.moyu.blog.common.RequestUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "认证", description = "邮箱验证码登录、极验人机校验")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/captcha/config")
    @Operation(summary = "获取人机验证配置", description = "前端据此决定是否加载极验 v4 SDK")
    public AuthDtos.CaptchaConfig captchaConfig() {
        return authService.captchaConfig();
    }

    @PostMapping("/email-code")
    @Operation(summary = "发送邮箱验证码", description = "同一邮箱 60 秒一次、每小时最多 5 次；生产环境通过 SMTP 发送")
    public AuthDtos.EmailCodeResponse requestCode(@Valid @RequestBody AuthDtos.EmailCodeRequest request,
                                                  HttpServletRequest httpRequest) {
        return authService.requestCode(request, RequestUtils.clientIp(httpRequest));
    }

    @PostMapping("/login")
    @Operation(summary = "邮箱验证码登录", description = "验证码一次性使用，5 分钟过期；管理员邮箱由 ADMIN_EMAILS 配置")
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "当前登录用户")
    public AuthDtos.UserView me() {
        return authService.me();
    }
}
