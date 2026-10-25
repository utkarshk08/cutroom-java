package com.cutroom.security;

import com.cutroom.error.ApiError;
import com.cutroom.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService tokens;
    private final UserRepository users;
    private final ObjectMapper json;

    public JwtAuthenticationFilter(JwtService tokens, UserRepository users, ObjectMapper json) {
        this.tokens = tokens;
        this.users = users;
        this.json = json;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Login/register use the supplied credentials, not an old session token.
        // A stale token must not prevent the user from signing in again.
        String path = request.getServletPath();
        return "POST".equals(request.getMethod())
                && ("/api/auth/login".equals(path) || "/api/auth/register".equals(path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null) {
            try {
                if (!header.startsWith("Bearer ")) throw new IllegalArgumentException("Invalid header.");
                Long userId = tokens.readUserId(header.substring(7));
                if (!users.existsById(userId)) throw new IllegalArgumentException("Account missing.");
                var authentication = new UsernamePasswordAuthenticationToken(
                        userId, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException exception) {
                SecurityContextHolder.clearContext();
                response.setStatus(401);
                response.setContentType("application/json");
                json.writeValue(response.getWriter(), new ApiError("Session is invalid or expired. Please sign in again."));
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
