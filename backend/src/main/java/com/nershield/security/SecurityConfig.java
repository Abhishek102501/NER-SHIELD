package com.nershield.security;

import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Stateless security foundation for the API.
 *
 * <p>The chain is already shaped for token authentication - no sessions, no CSRF token,
 * no login form - but no authentication mechanism is wired in yet. Until the JWT phase
 * adds a filter backed by {@link JwtTokenProvider}, every route other than the public
 * ones below answers 401.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(
            CorsConfigurationSource corsConfigurationSource,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                                        .permitAll()
                                        .requestMatchers("/api/health")
                                        .permitAll()
                                        .requestMatchers(EndpointRequest.to(HealthEndpoint.class))
                                        .permitAll()
                                        // Read-only, minimized threat metadata for the map — see
                                        // ThreatController. Public only because no auth mechanism
                                        // is wired in yet for any route; move behind auth alongside
                                        // the rest once JwtTokenProvider is implemented.
                                        .requestMatchers(HttpMethod.GET, "/api/threats")
                                        .permitAll()
                                        // Read-only, aggregated risk zone assessments — see
                                        // RiskZoneController. Same public-for-now rationale as
                                        // /api/threats above.
                                        .requestMatchers(HttpMethod.GET, "/api/risk/zones", "/api/risk/zones/*")
                                        .permitAll()
                                        // Read-only, aggregated incident feed — see
                                        // IncidentController. Same public-for-now rationale as
                                        // /api/threats above.
                                        .requestMatchers(HttpMethod.GET, "/api/incidents")
                                        .permitAll()
                                        // Escalation alert feed and acknowledgement — see
                                        // AlertController. Same public-for-now rationale as
                                        // /api/threats above; acknowledge is a demo-state
                                        // mutation with no sensitive data, not a privileged
                                        // action.
                                        .requestMatchers(HttpMethod.GET, "/api/alerts")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.PATCH, "/api/alerts/*/acknowledge")
                                        .permitAll()
                                        // Landslide4Sense AI analysis — see LandslideController.
                                        // Same public-for-now rationale as /api/threats above;
                                        // analyze/getAnalysis proxy the Python AI service and
                                        // carry no user-account data.
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/landslide/health",
                                                "/api/landslide/analysis/*")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/landslide/analyze")
                                        .permitAll()
                                        // Mumbai rainfall LSTM forecasting — see
                                        // RainfallController. Same public-for-now rationale
                                        // as /api/threats above; proxies the Python AI
                                        // service and carries no user-account data.
                                        .requestMatchers(HttpMethod.GET, "/api/rainfall/health")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST,
                                                "/api/rainfall/forecast",
                                                "/api/rainfall/forecast/demo",
                                                "/api/rainfall/explain",
                                                "/api/rainfall/explain/demo")
                                        .permitAll()
                                        // Field-report intake queue — see FieldReportController.
                                        // Same public-for-now rationale as /api/threats above.
                                        .requestMatchers(HttpMethod.GET, "/api/field-reports")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/field-reports")
                                        .permitAll()
                                        // Response-priority queue, unit roster and dispatch
                                        // recording — see ResponseController. Same
                                        // public-for-now rationale as /api/threats above.
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/response/incidents",
                                                "/api/response/units")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/response/dispatch")
                                        .permitAll()
                                        // Named GeoJSON layers for the GIS command map — see
                                        // GisController. Same public-for-now rationale as
                                        // /api/threats above.
                                        .requestMatchers(
                                                HttpMethod.GET, "/api/gis/layers", "/api/gis/layers/*")
                                        .permitAll()
                                        // Current-conditions weather (Open-Meteo, or an
                                        // honest unavailable state) — see WeatherController.
                                        // Same public-for-now rationale as /api/threats above.
                                        .requestMatchers(HttpMethod.GET, "/api/weather/current")
                                        .permitAll()
                                        // AI Disaster Response Agent proxy — see
                                        // AgentController. Same public-for-now rationale as
                                        // /api/threats above; the confirmedAction path
                                        // ultimately calls the same dispatch endpoint that
                                        // is already public for the same reason.
                                        .requestMatchers(HttpMethod.POST, "/api/agent/query")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .exceptionHandling(
                        handling ->
                                handling.authenticationEntryPoint(authenticationEntryPoint)
                                        .accessDeniedHandler(accessDeniedHandler))
                .headers(Customizer.withDefaults())
                .build();
    }
}
