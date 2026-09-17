package com.nershield.agent;

import com.nershield.agent.dto.AgentQueryRequest;
import com.nershield.agent.dto.AgentQueryResponse;
import org.springframework.stereotype.Service;

/** Assembles {@code POST /api/agent/query}. Depends only on {@link AgentClient} — the
 * Spring Boot backend never talks to an LLM, a vector store, or executes tool logic itself;
 * it only proxies to agent-service and remains the sole executor of the real {@code
 * POST /api/response/dispatch} write path (agent-service calls that same endpoint back). */
@Service
public class AgentService {

    private final AgentClient client;

    public AgentService(AgentClient client) {
        this.client = client;
    }

    public AgentQueryResponse query(AgentQueryRequest request) {
        if ((request.query() == null || request.query().isBlank()) && request.confirmedAction() == null) {
            throw new IllegalArgumentException("Either 'query' or 'confirmedAction' must be provided.");
        }
        return client.query(request);
    }
}
