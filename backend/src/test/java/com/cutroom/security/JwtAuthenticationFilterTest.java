package com.cutroom.security;

import com.cutroom.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    private final JwtService tokens = mock(JwtService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ObjectMapper json = new ObjectMapper();
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(tokens, users, json);
    private final FilterChain chain = mock(FilterChain.class);

    @BeforeEach
    void startWithEmptySecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/login", "/api/auth/register"})
    void publicAuthPostsIgnoreStaleTokens(String path) throws Exception {
        MockHttpServletRequest request = request("POST", path, "stale-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        verifyNoInteractions(tokens, users);
        assertEquals(200, response.getStatus());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @ParameterizedTest
    @CsvSource({
            "GET, /api/projects",
            "GET, /api/auth/login",
            "GET, /api/auth/register",
            "POST, /api/auth/login/refresh"
    })
    void invalidTokensOnOtherRequestsReturnUnauthorized(String method, String path) throws Exception {
        MockHttpServletRequest request = request(method, path, "stale-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(tokens.readUserId("stale-token")).thenThrow(new JwtException("Expired test token"));

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertEquals("application/json", response.getContentType());
        assertTrue(json.readTree(response.getContentAsString()).path("message").isTextual());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(tokens).readUserId("stale-token");
        verifyNoInteractions(users, chain);
    }

    @Test
    void validPrivateRequestAuthenticatesTheUserId() throws Exception {
        MockHttpServletRequest request = request("GET", "/api/projects", "valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(tokens.readUserId("valid-token")).thenReturn(7L);
        when(users.existsById(7L)).thenReturn(true);

        filter.doFilter(request, response, chain);

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertTrue(authentication.isAuthenticated());
        assertInstanceOf(Long.class, authentication.getPrincipal());
        assertEquals(7L, authentication.getPrincipal());
        verify(users).existsById(7L);
        verify(chain).doFilter(request, response);
        assertEquals(200, response.getStatus());
    }

    private MockHttpServletRequest request(String method, String path, String token) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }
}
