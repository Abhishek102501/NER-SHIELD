package com.nershield.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Settings for the JWT authentication that will be added in a later phase.
 *
 * <p>{@code secret} is intentionally allowed to be blank for now so the application can
 * boot before authentication exists; the future {@link JwtTokenProvider} implementation
 * is responsible for rejecting a blank secret at startup.
 *
 * @param issuer value placed in, and required from, the {@code iss} claim
 * @param secret signing key, supplied through the {@code JWT_SECRET} environment variable
 * @param accessTokenTtl lifetime of an access token
 * @param refreshTokenTtl lifetime of a refresh token
 */
@ConfigurationProperties(prefix = "nershield.security.jwt")
public record JwtProperties(
        @DefaultValue("ner-shield") String issuer,
        @DefaultValue("") String secret,
        @DefaultValue("15m") Duration accessTokenTtl,
        @DefaultValue("7d") Duration refreshTokenTtl) {

    /** Whether a signing secret has been supplied. */
    public boolean isConfigured() {
        return secret != null && !secret.isBlank();
    }
}
