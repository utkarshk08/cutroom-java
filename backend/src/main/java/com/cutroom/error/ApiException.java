package com.cutroom.error;

import org.springframework.http.HttpStatus;

// Only use this for safe, intentional messages that may be shown to the user.
public class ApiException extends RuntimeException {
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }
}
