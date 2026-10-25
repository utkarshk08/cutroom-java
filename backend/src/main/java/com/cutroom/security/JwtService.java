package com.cutroom.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey signingKey;

    public JwtService(@Value("${app.jwt.secret}") String secret) {
        try {
            signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        } catch (RuntimeException exception) {
            throw new IllegalStateException("JWT_SECRET must be Base64 containing at least 32 random bytes.");
        }
    }

    public String createToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer("cutroom-learning")
                .subject(userId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(signingKey)
                .compact();
    }

    public Long readUserId(String token) {
        // The parser verifies the signature and expiry before we trust its subject.
        String subject = Jwts.parser().verifyWith(signingKey)
                .requireIssuer("cutroom-learning").build()
                .parseSignedClaims(token).getPayload().getSubject();
        long userId = Long.parseLong(subject);
        if (userId <= 0) throw new IllegalArgumentException("Invalid user ID.");
        return userId;
    }
}
