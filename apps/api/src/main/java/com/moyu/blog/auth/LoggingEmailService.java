package com.moyu.blog.auth;

import com.moyu.blog.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@ConditionalOnProperty(name = "app.mail.mode", havingValue = "log", matchIfMissing = true)
public class LoggingEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailService.class);

    private final AppProperties properties;

    public LoggingEmailService(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void sendLoginCode(String to, String code, Duration ttl) {
        log.info("""

                ┌──────────────────────────────────────────────┐
                   MOYU 登录验证码（开发模式，未真实发送邮件）
                   收件人: {}
                   验证码: {}
                   有效期: {} 分钟
                   生产环境请设置 MAIL_MODE=smtp 与 SMTP 参数
                └──────────────────────────────────────────────┘
                """, to, code, ttl.toMinutes());
        if (!properties.mail().fromAddress().isBlank()) {
            log.debug("mail from: {} <{}>", properties.mail().fromName(), properties.mail().fromAddress());
        }
    }
}
