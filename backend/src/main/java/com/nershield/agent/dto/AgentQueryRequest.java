package com.nershield.agent.dto;

/**
 * Body of {@code POST /api/agent/query}. Exactly one of {@code query} or {@code
 * confirmedAction} should be set: a fresh natural-language question, or the confirmation of
 * a previously-returned {@code proposedAction} — never both, never neither.
 */
public record AgentQueryRequest(String query, ConfirmedActionRequest confirmedAction) {}
