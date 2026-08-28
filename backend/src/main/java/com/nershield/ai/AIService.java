package com.nershield.ai;

import com.nershield.ai.dto.AIHealthResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Application-facing entry point for AI capabilities.
 *
 * <p>Domain code depends on this service, never on {@link AIClient}, so that retries,
 * caching and fallbacks can be introduced later without touching call sites.
 */
@Service
public class AIService {

    private static final Logger log = LoggerFactory.getLogger(AIService.class);

    private final AIClient client;

    public AIService(AIClient client) {
        this.client = client;
    }

    /**
     * Reports the AI service health.
     *
     * @throws AIServiceException if the service cannot be reached
     */
    public AIHealthResponse health() {
        return client.health();
    }

    /**
     * Non-throwing availability probe, for callers that must degrade gracefully when the
     * AI service is down.
     */
    public boolean isAvailable() {
        try {
            AIHealthResponse response = client.health();
            return response != null && "UP".equalsIgnoreCase(response.status());
        } catch (AIServiceException ex) {
            log.warn("AI service is unavailable: {}", ex.getMessage());
            return false;
        }
    }
}
