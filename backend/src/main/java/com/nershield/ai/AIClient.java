package com.nershield.ai;

import com.nershield.ai.dto.AIHealthResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * HTTP transport to the Python AI service.
 *
 * <p>This layer owns nothing but the wire: base URL, timeouts, request/response mapping
 * and error translation. Callers go through {@link AIService} rather than using this
 * directly. The AI service itself does not exist yet - only {@link #health()} is defined,
 * and inference calls are added alongside the FastAPI endpoints that back them.
 */
@Component
public class AIClient {

    private final RestClient restClient;

    public AIClient(RestClient.Builder builder, AIProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.connectTimeout().toMillis());
        requestFactory.setReadTimeout((int) properties.readTimeout().toMillis());

        this.restClient =
                builder.baseUrl(properties.baseUrl()).requestFactory(requestFactory).build();
    }

    /**
     * Calls {@code GET /health} on the AI service.
     *
     * @throws AIServiceException if the service is unreachable or returns an error status
     */
    public AIHealthResponse health() {
        try {
            return restClient.get().uri("/health").retrieve().body(AIHealthResponse.class);
        } catch (RestClientException ex) {
            throw new AIServiceException("AI service health check failed.", ex);
        }
    }
}
