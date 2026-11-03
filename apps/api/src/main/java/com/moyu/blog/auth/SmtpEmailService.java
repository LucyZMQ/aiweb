package com.moyu.blog.auth;

import com.moyu.blog.common.ApiException;
import com.moyu.blog.config.AppProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@ConditionalOnProperty(name = "app.mail.mode", havingValue = "smtp")
public class SmtpEmailService implements EmailService {

    private final JavaMailSender mailSender;
    private final AppProperties properties;

    public SmtpEmailService(JavaMailSender mailSender, AppProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public void sendLoginCode(String to, String code, Duration ttl) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("%s <%s>".formatted(properties.mail().fromName(), properties.mail().fromAddress()));
        message.setTo(to);
        message.setSubject("墨屿 MOYU · 登录验证码");
        message.setText("""
                你好，

                你的登录验证码是：%s

                %d 分钟内有效，仅可使用一次。若非本人操作，请忽略这封邮件。

                —— 墨屿 MOYU
                """.formatted(code, ttl.toMinutes()));
        try {
            mailSender.send(message);
        } catch (RuntimeException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "MAIL_SEND_FAILED", "验证码邮件发送失败，请稍后重试");
        }
    }
}
