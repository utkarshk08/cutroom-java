package com.cutroom.auth;

import com.cutroom.error.ApiException;
import com.cutroom.security.JwtService;
import com.cutroom.user.User;
import com.cutroom.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService tokens;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtService tokens) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        checkPasswordBytes(request.password());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with that email already exists.");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(request.password()));
        try {
            // Flushing here also handles two registrations arriving at the same time.
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "That account could not be created. Try another email.");
        }
        return response(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        checkPasswordBytes(request.password());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user = users.findByEmail(email).orElseThrow(this::invalidLogin);
        if (!passwords.matches(request.password(), user.getPasswordHash())) {
            throw invalidLogin();
        }
        return response(user);
    }

    private AuthResponse response(User user) {
        return new AuthResponse(tokens.createToken(user.getId()), user.getName(), user.getEmail());
    }

    private ApiException invalidLogin() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    }

    private void checkPasswordBytes(String password) {
        // BCrypt limits bytes, not characters. Emoji can use several UTF-8 bytes each.
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at most 72 UTF-8 bytes.");
        }
    }
}
