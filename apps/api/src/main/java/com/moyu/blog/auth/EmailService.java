package com.moyu.blog.auth;

import java.time.Duration;

public interface EmailService {

    void sendLoginCode(String to, String code, Duration ttl);
}
