package com.brazcubas.apsii.config;

import java.util.Map;

public class ApiException extends RuntimeException {
    private final int statusCode;
    private final String code;
    private final Map<String, String> details;

    public ApiException(int statusCode, String code, String message) {
        this(statusCode, code, message, Map.of());
    }

    public ApiException(int statusCode, String code, String message, Map<String, String> details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = Map.copyOf(details);
    }

    public int statusCode() {
        return statusCode;
    }

    public String code() {
        return code;
    }

    public Map<String, String> details() {
        return details;
    }

    public static ApiException validation(String field, String message) {
        return new ApiException(422, "VALIDATION_ERROR", "Invalid request parameters.", Map.of(field, message));
    }
}
