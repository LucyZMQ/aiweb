package com.moyu.blog.post;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/posts")
@Tag(name = "后台文章", description = "需要管理员 Bearer Token")
@SecurityRequirement(name = "bearerAuth")
public class AdminPostController {

    private final PostService postService;

    public AdminPostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    @Operation(summary = "后台文章列表")
    public PostDtos.PostPage list(@RequestParam(required = false) String status,
                                  @RequestParam(required = false) String q,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return postService.listAdmin(status, q, page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取文章编辑数据")
    public PostDtos.PostDetail detail(@PathVariable UUID id) {
        return postService.getAdmin(id);
    }

    @PostMapping
    @Operation(summary = "创建文章")
    public ResponseEntity<PostDtos.PostDetail> create(@Valid @RequestBody PostDtos.PostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新文章")
    public PostDtos.PostDetail update(@PathVariable UUID id, @Valid @RequestBody PostDtos.PostRequest request) {
        return postService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "删除文章")
    public void delete(@PathVariable UUID id) {
        postService.delete(id);
    }
}
