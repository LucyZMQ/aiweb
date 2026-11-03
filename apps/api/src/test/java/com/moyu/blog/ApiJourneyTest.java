package com.moyu.blog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:moyu;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.demo-data=false",
        "app.auth.expose-dev-code=true",
        "app.storage.provider=local",
        "app.storage.local-dir=target/test-uploads",
        "app.mail.mode=log",
        "management.health.mail.enabled=false"
})
@AutoConfigureMockMvc
class ApiJourneyTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void emailLoginCreatePublishUploadAndCollectAnalytics() throws Exception {
        MvcResult codeResult = mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@moyu.local"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresInSeconds").value(300))
                .andReturn();

        JsonNode codeJson = objectMapper.readTree(codeResult.getResponse().getContentAsString());
        String code = codeJson.path("devCode").asText();
        assertThat(code).hasSize(6);

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@moyu.local","code":"%s"}
                                """.formatted(code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("token").asText();
        assertThat(token).isNotBlank();

        mockMvc.perform(get("/api/admin/posts"))
                .andExpect(status().isUnauthorized());

        MvcResult createResult = mockMvc.perform(post("/api/admin/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "测试文章",
                                  "slug": "test-story",
                                  "excerpt": "一篇用于自动化测试的文章摘要。",
                                  "content": "# 正文\\n\\n这是一段测试正文。",
                                  "coverUrl": "/covers/edge.svg",
                                  "tags": ["测试", "集成"],
                                  "status": "PUBLISHED"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("test-story"))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andReturn();

        String postId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("id").asText();

        mockMvc.perform(get("/api/public/posts/test-story"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("测试文章"))
                .andExpect(jsonPath("$.viewCount").value(1));

        mockMvc.perform(get("/api/public/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts").value(1));

        mockMvc.perform(post("/api/analytics/collect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"path":"/posts/test-story","referrer":"https://example.com","visitorId":"visitor-1","sessionId":"session-1"}
                                """))
                .andExpect(status().isNoContent());

        MockMultipartFile file = new MockMultipartFile(
                "file", "cover.png", "image/png",
                new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
        MvcResult uploadResult = mockMvc.perform(multipart("/api/admin/media")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andReturn();

        String mediaUrl = objectMapper.readTree(uploadResult.getResponse().getContentAsString())
                .path("url").asText();
        mockMvc.perform(get(mediaUrl))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/admin/posts/{id}", postId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/public/posts/test-story"))
                .andExpect(status().isNotFound());
    }
}
