package com.nershield.common;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;

/**
 * Error payload returned by every failing API call.
 *
 * @param timestamp when the error was produced (UTC)
 * @param status HTTP status code
 * @param error HTTP status reason phrase
 * @param message human-readable, safe-to-expose description
 * @param path request path that produced the error
 * @param details field-level validation failures; {@code null} when not applicable
 */
public record ApiErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        List<ValidationError> details) {

    /** A single field-level validation failure. */
    public record ValidationError(String field, String message) {}

    public static ApiErrorResponse of(HttpStatus status, String message, String path) {
        return new ApiErrorResponse(
                OffsetDateTime.now(), status.value(), status.getReasonPhrase(), message, path, null);
    }

    public static ApiErrorResponse of(
            HttpStatus status, String message, String path, List<ValidationError> details) {
        return new ApiErrorResponse(
                OffsetDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                path,
                details.isEmpty() ? null : details);
    }
}
