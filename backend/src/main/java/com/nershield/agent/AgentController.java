package com.nershield.agent;

import com.nershield.agent.dto.AgentQueryRequest;
import com.nershield.agent.dto.AgentQueryResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code POST /api/agent/query} — the AI Disaster Response Agent. Proxies to {@code
 * agent-service} (a separate FastAPI process; see {@code agent-service/README.md}). Public
 * only because no auth mechanism is wired in yet, same rationale as {@code
 * ThreatController}.
 */
@RestController
public class AgentController {

    private final AgentService service;

    public AgentController(AgentService service) {
        this.service = service;
    }

    @PostMapping("/api/agent/query")
    public AgentQueryResponse query(@RequestBody AgentQueryRequest request) {
        return service.query(request);
    }
}
