package com.nershield.security;

import java.util.Collection;

/**
 * Contract for issuing and verifying NER-SHIELD access tokens.
 *
 * <p><strong>Not implemented yet.</strong> This interface fixes the boundary that the
 * authentication phase will fill in: an implementation plus a request filter that turns a
 * bearer token into an {@code Authentication}. No bean of this type exists today, and
 * nothing in the application injects it.
 */
public interface JwtTokenProvider {

    /**
     * Issues a signed access token.
     *
     * @param subject stable user identifier placed in the {@code sub} claim
     * @param roles authorities granted to the user
     */
    String issueAccessToken(String subject, Collection<String> roles);

    /** Returns {@code true} when the token's signature, issuer and expiry all check out. */
    boolean isValid(String token);

    /**
     * Reads the {@code sub} claim of a token previously accepted by {@link #isValid}.
     *
     * @throws IllegalArgumentException if the token cannot be parsed
     */
    String extractSubject(String token);
}
