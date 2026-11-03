package com.moyu.blog.auth;

import com.moyu.blog.user.UserAccount;

import java.util.UUID;

public record UserPrincipal(UUID id, String email, String displayName, String role) {

    public static UserPrincipal from(UserAccount user) {
        return new UserPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name());
    }
}
