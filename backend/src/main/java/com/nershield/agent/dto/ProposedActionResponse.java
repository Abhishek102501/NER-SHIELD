package com.nershield.agent.dto;

/** A write action the agent recommends but has NOT executed — requires explicit user
 * confirmation (a follow-up {@code POST /api/agent/query} with {@code confirmedAction} set)
 * before {@code POST /api/response/dispatch} is ever called. */
public record ProposedActionResponse(String type, String incidentId, String unitId, String reason) {}
