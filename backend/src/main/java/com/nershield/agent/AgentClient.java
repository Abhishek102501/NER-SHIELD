package com.nershield.agent;

import com.nershield.agent.dto.AgentQueryRequest;
import com.nershield.agent.dto.AgentQueryResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** HTTP transport to the {@code agent-service} FastAPI process. Same {@code RestClient}
 * pattern as {@link com.nershield.rainfall.RainfallClient}/{@link com.nershield.landslide.LandslideClient}. */
@Component
public class AgentClient {

    private final RestClient restClient;

    public AgentClient(RestClient.Builder builder, AgentProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.connectTimeout().toMillis());
        requestFactory.setReadTimeout((int) properties.readTimeout().toMillis());

        this.restClient =
                builder.baseUrl(properties.baseUrl()).requestFactory(requestFactory).build();
    }

    /** @throws AgentServiceException if agent-service is unreachable or returns an error status */
    public AgentQueryResponse query(AgentQueryRequest request) {
        try {
            return restClient
                    .post()
                    .uri("/query")
                    .body(request)
                    .retrieve()
                    .body(AgentQueryResponse.class);
        } catch (RestClientException ex) {
            throw new AgentServiceException("Agent service call failed.", ex);
        }
    }
}
