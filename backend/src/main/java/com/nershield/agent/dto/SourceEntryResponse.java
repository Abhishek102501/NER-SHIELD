package com.nershield.agent.dto;

/** One piece of evidence the agent used, with its honest data-origin classification. */
public record SourceEntryResponse(String tool, String dataOrigin, String summary) {}
