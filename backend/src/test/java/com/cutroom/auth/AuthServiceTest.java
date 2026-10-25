package com.cutroom.auth;

import com.cutroom.error.ApiException;
import com.cutroom.security.JwtService;
import com.cutroom.user.User;
import com.cutroom.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final JwtService tokens = mock(JwtService.class);
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    private final AuthService auth = new AuthService(users, passwords, tokens);

    @Test
    void registrationHashesPasswordAndNormalizesEmail() {
        when(users.saveAndFlush(any())).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            assertEquals("student@example.com", user.getEmail());
            assertNotEquals("learning-password", user.getPasswordHash());
            assertTrue(passwords.matches("learning-password", user.getPasswordHash()));
            user.setId(7L);
            return user;
        });
        when(tokens.createToken(7L)).thenReturn("test-token");
        AuthResponse result = auth.register(new RegisterRequest(" Student ", "Student@Example.com", "learning-password"));
        assertEquals("Student", result.name());
        assertEquals("test-token", result.token());
    }

    @Test
    void wrongPasswordAndUnknownEmailHaveTheSameMessage() {
        User user = new User();
        user.setPasswordHash(passwords.encode("correct-password"));
        when(users.findByEmail("known@example.com")).thenReturn(Optional.of(user));
        when(users.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
        ApiException wrong = assertThrows(ApiException.class, () -> auth.login(new LoginRequest("known@example.com", "wrong-password")));
        ApiException unknown = assertThrows(ApiException.class, () -> auth.login(new LoginRequest("unknown@example.com", "wrong-password")));
        assertEquals(wrong.getMessage(), unknown.getMessage());
        verifyNoInteractions(tokens);
    }

    @Test
    void unicodePasswordsMustFitBcryptByteLimit() {
        assertThrows(ApiException.class, () -> auth.register(new RegisterRequest("Student", "student@example.com", "😀".repeat(20))));
        verifyNoInteractions(users);
    }
}
