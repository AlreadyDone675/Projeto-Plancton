package com.brazcubas.apsii.config;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

public final class DateTimeUtils {
    private DateTimeUtils() {}

    public static Instant parseUtc(String value) {
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ignored) {
            try {
                return OffsetDateTime.parse(value).toInstant();
            } catch (DateTimeParseException ignoredOffset) {
                return LocalDateTime.parse(value).toInstant(ZoneOffset.UTC);
            }
        }
    }
}
