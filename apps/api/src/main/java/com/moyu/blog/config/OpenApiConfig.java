package com.moyu.blog.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI moyuOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("墨屿 MOYU API")
                        .version("0.1.0")
                        .description("""
                                一个用于学习和演示的完整博客后端。

                                - 登录：邮箱验证码 + 极验 v4
                                - 内容：文章、标签、阅读量
                                - 素材：本地磁盘 / 腾讯云 COS
                                - 数据：第一方 PV/UV 埋点
                                """)
                        .contact(new Contact().name("MOYU").url("https://github.com/")))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("登录后返回的 JWT，填写时不需要 Bearer 前缀")));
    }
}
