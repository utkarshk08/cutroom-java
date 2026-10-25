package com.cutroom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Our JWT filter and MySQL users replace Spring's generated development user.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class CutroomApplication {
    public static void main(String[] args) {
        SpringApplication.run(CutroomApplication.class, args);
    }
}
