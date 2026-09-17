package com.nershield.agent.dto;

import java.util.List;
import java.util.Map;

/**
 * Mirrors agent-service's {@code AgentResponseModel} exactly (see {@code
 * agent-service/src/agent_service/main.py}), field for field.
 *
 * @param available {@code false} whenever no grounded answer could be produced (e.g. no LLM
 *     configured) — {@code answer} is {@code null} in that case, never a fabricated response
 * @param reason set only when {@code available=false}: why
 */
public record AgentQueryResponse(
        boolean available,
        String answer,
        String confidence,
        List<String> toolsUsed,
        List<SourceEntryResponse> sources,
        List<Map<String, Object>> retrievedDocuments,
        List<String> recommendations,
        boolean requiresConfirmation,
        ProposedActionResponse proposedAction,
        String reason) {}
