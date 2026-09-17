package com.nershield.agent;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuration for the {@code agent-service} FastAPI process this backend proxies to. */
@ConfigurationProperties(prefix = "nershield.agent")
public record AgentProperties(String baseUrl, Duration connectTimeout, Duration readTimeout) {

    public AgentProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:8100";
        }
        if (connectTimeout == null) {
            connectTimeout = Duration.ofSeconds(5);
        }
        if (readTimeout == null) {
            readTimeout = Duration.ofSeconds(20);
        }
    }
}
