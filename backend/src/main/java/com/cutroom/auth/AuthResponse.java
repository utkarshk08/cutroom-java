package com.cutroom.auth;

// Password hashes never leave the backend.
public record AuthResponse(String token, String name, String email) { }
