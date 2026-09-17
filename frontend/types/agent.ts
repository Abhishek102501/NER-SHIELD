/**
 * Mirrors the backend's `AgentQueryResponse` record exactly (see
 * `backend/.../agent/dto/AgentQueryResponse.java`), which itself mirrors agent-service's
 * `AgentResponseModel` — field for field, no shape translation needed at either hop.
 */
export interface AgentSource {
  tool: string;
  dataOrigin: string;
  summary: string;
}

export interface ProposedAction {
  type: string;
  incidentId: string;
  unitId: string;
  reason: string;
}

export interface AgentQueryResult {
  available: boolean;
  answer: string | null;
  confidence: string | null;
  toolsUsed: string[];
  sources: AgentSource[];
  retrievedDocuments: Record<string, unknown>[];
  recommendations: string[];
  requiresConfirmation: boolean;
  proposedAction: ProposedAction | null;
  reason: string | null;
}

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: AgentQueryResult;
}
