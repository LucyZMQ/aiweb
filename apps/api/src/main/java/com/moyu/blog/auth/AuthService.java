package com.moyu.blog.auth;

import com.moyu.blog.common.ApiException;
import com.moyu.blog.config.AppProperties;
import com.moyu.blog.user.Role;
import com.moyu.blog.user.UserAccount;
import com.moyu.blog.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class AuthService {

    private final EmailCodeRepository emailCodeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final GeetestService geetestService;
    private final JwtService jwtService;
    private final AppProperties.Auth auth;
    private final String ipSalt;
    private final SecureRandom random = new SecureRandom();

    public AuthService(EmailCodeRepository emailCodeRepository,
                       UserRepository userRepository,
                       EmailService emailService,
                       GeetestService geetestService,
                       JwtService jwtService,
                       AppProperties properties) {
        this.emailCodeRepository = emailCodeRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.geetestService = geetestService;
        this.jwtService = jwtService;
        this.auth = properties.auth();
        this.ipSalt = properties.analytics().ipSalt();
    }

    public AuthDtos.CaptchaConfig captchaConfig() {
        return new AuthDtos.CaptchaConfig(geetestService.enabled(),
                geetestService.enabled() ? geetestService.captchaId() : null);
    }

    @Transactional
    public AuthDtos.EmailCodeResponse requestCode(AuthDtos.EmailCodeRequest request, String clientIp) {
        String email = normalize(request.email());
        geetestService.verify(request.captcha(), clientIp);

        Instant hourAgo = Instant.now().minusSeconds(3600);
        if (emailCodeRepository.countByEmailAndCreatedAtAfter(email, hourAgo) >= 5) {
            throw ApiException.tooManyRequests("验证码请求过于频繁，请一小时后再试");
        }
        emailCodeRepository.findFirstByEmailOrderByCreatedAtDesc(email).ifPresent(last -> {
            if (last.getCreatedAt().isAfter(Instant.now().minusSeconds(60))) {
                throw ApiException.tooManyRequests("请 60 秒后再获取验证码");
            }
        });

        String code = "%06d".formatted(random.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(auth.codeTtl());
        emailCodeRepository.save(new EmailCode(email, hash(email, code), expiresAt, hashIp(clientIp)));
        emailService.sendLoginCode(email, code, auth.codeTtl());

        String devCode = auth.exposeDevCode() ? code : null;
        return new AuthDtos.EmailCodeResponse("验证码已发送，请检查邮箱", auth.codeTtl().toSeconds(), devCode);
    }

    @Transactional
    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        String email = normalize(request.email());
        EmailCode record = emailCodeRepository
                .findFirstByEmailAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .orElseThrow(() -> ApiException.unauthorized("验证码无效，请重新获取"));

        if (record.isConsumed() || record.isExpired() || record.getAttempts() >= 5) {
            throw ApiException.unauthorized("验证码已失效，请重新获取");
        }
        boolean matches = MessageDigest.isEqual(
                record.getCodeHash().getBytes(StandardCharsets.UTF_8),
                hash(email, request.code().trim()).getBytes(StandardCharsets.UTF_8));
        if (!matches) {
            record.recordFailure();
            emailCodeRepository.save(record);
            throw ApiException.unauthorized("验证码不正确");
        }

        record.consume();
        emailCodeRepository.save(record);

        UserAccount user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            Role role = auth.adminEmails().stream().anyMatch(admin -> admin.equalsIgnoreCase(email))
                    ? Role.ADMIN : Role.READER;
            int at = email.indexOf('@');
            String displayName = (at > 0 ? email.substring(0, at) : email);
            if (displayName.length() > 80) {
                displayName = displayName.substring(0, 80);
            }
            return userRepository.save(new UserAccount(email, displayName, role));
        });
        if (!auth.adminEmails().stream().anyMatch(admin -> admin.equalsIgnoreCase(email))) {
            // 管理员白名单以配置为准，避免后台被非白名单账号访问。
            if (user.getRole() == Role.ADMIN) {
                user.setRole(Role.READER);
            }
        } else if (user.getRole() != Role.ADMIN) {
            user.setRole(Role.ADMIN);
        }
        user.markLogin();
        userRepository.save(user);

        JwtService.IssuedToken token = jwtService.issue(user);
        return new AuthDtos.LoginResponse(token.value(), token.expiresAt(), toView(user));
    }

    public AuthDtos.UserView me() {
        UserPrincipal principal = CurrentUser.require();
        UserAccount user = userRepository.findById(principal.id())
                .orElseThrow(() -> ApiException.unauthorized("用户不存在，请重新登录"));
        return toView(user);
    }

    private static AuthDtos.UserView toView(UserAccount user) {
        return new AuthDtos.UserView(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name());
    }

    private String hash(String email, String code) {
        return hmacSha256(email + ":" + code, auth.jwtSecret());
    }

    private String hashIp(String ip) {
        return hmacSha256(ip == null ? "" : ip, ipSalt);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String hmacSha256(String value, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash value", ex);
        }
    }
}
