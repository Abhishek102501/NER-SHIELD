package com.nershield.ai;

import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Connection settings for the Python AI service.
 *
 * @param baseUrl root URL of the FastAPI service, e.g. {@code http://localhost:8000}
 * @param connectTimeout maximum time to establish a TCP connection
 * @param readTimeout maximum time to wait for a response
 */
@Validated
@ConfigurationProperties(prefix = "nershield.ai")
public record AIProperties(
        @NotBlank String baseUrl,
        @DefaultValue("5s") Duration connectTimeout,
        @DefaultValue("30s") Duration readTimeout) {}
