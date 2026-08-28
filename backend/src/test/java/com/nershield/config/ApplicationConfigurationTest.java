package com.nershield.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.nershield.ai.AIProperties;
import com.nershield.security.JwtProperties;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

/** Verifies that externalised configuration binds and reaches the beans that use it. */
@SpringBootTest
@ActiveProfiles("test")
class ApplicationConfigurationTest {

    @Autowired private CorsProperties corsProperties;
    @Autowired private AIProperties aiProperties;
    @Autowired private JwtProperties jwtProperties;
    @Autowired private CorsConfigurationSource corsConfigurationSource;

    @Test
    void corsPropertiesBind() {
        assertThat(corsProperties.allowedOrigins()).containsExactly("http://localhost:3000");
        assertThat(corsProperties.allowedMethods()).contains("GET", "POST", "OPTIONS");
        assertThat(corsProperties.allowCredentials()).isTrue();
    }

    @Test
    void corsPolicyAppliesToApiRoutes() {
        CorsConfiguration configuration =
                ((org.springframework.web.cors.UrlBasedCorsConfigurationSource)
                                corsConfigurationSource)
                        .getCorsConfigurations()
                        .get("/api/**");

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins()).containsExactly("http://localhost:3000");
    }

    @Test
    void aiPropertiesBind() {
        assertThat(aiProperties.baseUrl()).isEqualTo("http://localhost:8000");
        assertThat(aiProperties.connectTimeout()).isEqualTo(Duration.ofSeconds(5));
        assertThat(aiProperties.readTimeout()).isEqualTo(Duration.ofSeconds(30));
    }

    @Test
    void jwtPropertiesBindAndReportUnconfiguredSecret() {
        assertThat(jwtProperties.issuer()).isEqualTo("ner-shield-test");
        assertThat(jwtProperties.accessTokenTtl()).isEqualTo(Duration.ofMinutes(15));
        // No JWT_SECRET is set in tests, so the JWT phase has not been enabled.
        assertThat(jwtProperties.isConfigured()).isFalse();
    }
}
