package com.nershield.config;

import jakarta.validation.constraints.NotEmpty;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Cross-origin settings for the Next.js frontend.
 *
 * <p>Origins are configured rather than hardcoded so that development, staging and
 * production deployments differ only by environment variable.
 */
@Validated
@ConfigurationProperties(prefix = "nershield.cors")
public record CorsProperties(
        @NotEmpty List<String> allowedOrigins,
        @DefaultValue("GET,POST,PUT,PATCH,DELETE,OPTIONS") List<String> allowedMethods,
        @DefaultValue("*") List<String> allowedHeaders,
        @DefaultValue("true") boolean allowCredentials,
        @DefaultValue("1h") Duration maxAge) {}
