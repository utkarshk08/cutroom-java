package com.cutroom.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    // Test-only key, never used by application.properties or a real account.
    private static final String SECRET = Base64.getEncoder().encodeToString(new byte[32]);
    private final JwtService tokens = new JwtService(SECRET);

    @Test
    void signedTokenReturnsOwnerId() {
        assertEquals(7L, tokens.readUserId(tokens.createToken(7L)));
    }

    @Test
    void expiredTokenIsRejected() {
        String expired = Jwts.builder().issuer("cutroom-learning").subject("7")
                .expiration(Date.from(Instant.now().minusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET))).compact();
        assertThrows(ExpiredJwtException.class, () -> tokens.readUserId(expired));
    }

    @Test
    void tokenSignedByAnotherKeyIsRejected() {
        String differentSecret = Base64.getEncoder().encodeToString("different-test-key-32-bytes-long!!".getBytes());
        String token = new JwtService(differentSecret).createToken(7L);
        assertThrows(JwtException.class, () -> tokens.readUserId(token));
    }

    @Test
    void malformedTokenIsRejected() {
        assertThrows(JwtException.class, () -> tokens.readUserId("not-a-token"));
    }

    @Test
    void weakConfiguredSecretStopsStartup() {
        assertThrows(IllegalStateException.class, () -> new JwtService("c2hvcnQ="));
    }
}
