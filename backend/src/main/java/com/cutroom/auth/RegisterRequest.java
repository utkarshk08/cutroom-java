package com.cutroom.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// A record is a small immutable data carrier; Java generates its constructor/accessors.
public record RegisterRequest(
        @NotBlank @Size(max = 80) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 64) String password
) { }
