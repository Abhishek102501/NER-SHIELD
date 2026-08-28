package com.nershield.common;

import com.nershield.common.ApiErrorResponse.ValidationError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Translates exceptions into a single {@link ApiErrorResponse} shape.
 *
 * <p>Only messages that are safe to expose reach the client; unexpected failures are
 * logged with their stack trace and reported as a generic 500.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<ApiErrorResponse> handleUnknownRoute(
            Exception ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "No endpoint for this request.", request);
    }

    /** Request body failed {@code @Valid} validation. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleBodyValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ValidationError> details =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(error -> new ValidationError(error.getField(), error.getDefaultMessage()))
                        .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ApiErrorResponse.of(
                                HttpStatus.BAD_REQUEST,
                                "Validation failed.",
                                request.getRequestURI(),
                                details));
    }

    /** Constraint violation on a path variable, request parameter or service argument. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {
        List<ValidationError> details =
                ex.getConstraintViolations().stream()
                        .map(
                                violation ->
                                        new ValidationError(
                                                String.valueOf(violation.getPropertyPath()),
                                                violation.getMessage()))
                        .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(
                        ApiErrorResponse.of(
                                HttpStatus.BAD_REQUEST,
                                "Validation failed.",
                                request.getRequestURI(),
                                details));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleHandlerMethodValidation(
            HandlerMethodValidationException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Validation failed.", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "Access denied.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception for {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", request);
    }

    private ResponseEntity<ApiErrorResponse> build(
            HttpStatus status, String message, HttpServletRequest request) {
        return ResponseEntity.status(status)
                .body(ApiErrorResponse.of(status, message, request.getRequestURI()));
    }
}
