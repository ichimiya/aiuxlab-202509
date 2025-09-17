export interface VoiceEventJob {
  sessionId: string;
  timestamp: string;
  transcript: string;
  confidence: number;
  isFinal: boolean;
  metadata: {
    locale: string;
    device: string;
    chunkSeq: number;
  };
}

export interface VoiceSessionState {
  sessionId: string;
  status: "idle" | "optimizing" | "ready" | "researching";
  candidates: Array<{
    id: string;
    query: string;
    coverageScore: number;
    rank: number;
    source: "llm" | "manual";
  }>;
  selectedCandidateId?: string;
  lastUpdatedAt: string;
}

export interface VoiceIntentInput {
  sessionId: string;
  text: string;
  context: Record<string, unknown>;
}

export interface VoiceIntentResult {
  intentId: string;
  confidence: number;
  parameters: Record<string, unknown>;
}

export interface VoiceSseEvent {
  type: "session_update" | "intent_confirmation" | "error";
  sessionId: string;
  payload: unknown;
}

export interface VoiceEventQueuePort {
  enqueue(job: VoiceEventJob): Promise<void>;
}

export interface VoiceSessionStorePort {
  get(sessionId: string): Promise<VoiceSessionState | null>;
  set(session: VoiceSessionState): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export interface VoiceIntentClassifierPort {
  classify(input: VoiceIntentInput): Promise<VoiceIntentResult>;
}

export interface VoiceNotificationPort {
  publish(event: VoiceSseEvent): Promise<void>;
}
