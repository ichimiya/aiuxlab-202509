import { describe, it, expect, beforeEach } from "vitest";
import { useVoiceRecognitionStore } from "./voiceRecognitionStore";

describe("voiceRecognitionStore", () => {
  beforeEach(() => {
    useVoiceRecognitionStore.getState().reset();
  });

  it("セッション更新で状態が差し替えられる", () => {
    const { setSessionId, applySessionUpdate, setSessionState } =
      useVoiceRecognitionStore.getState();

    setSessionId("session-1");

    applySessionUpdate({
      sessionId: "session-1",
      status: "optimizing",
      candidates: [
        {
          id: "candidate-1",
          query: "AI リスク 重大事例",
          coverageScore: 0.82,
          rank: 1,
          source: "llm",
        },
      ],
      lastUpdatedAt: "2025-09-17T02:00:00.000Z",
    });

    const stateAfterUpdate = useVoiceRecognitionStore.getState();
    expect(stateAfterUpdate.sessionState?.status).toBe("optimizing");
    expect(stateAfterUpdate.sessionState?.candidates).toHaveLength(1);

    setSessionState({
      sessionId: "session-1",
      status: "ready",
      candidates: [],
      selectedCandidateId: "candidate-1",
      lastUpdatedAt: "2025-09-17T02:01:00.000Z",
    });

    const stateAfterSet = useVoiceRecognitionStore.getState();
    expect(stateAfterSet.sessionState?.status).toBe("ready");
    expect(stateAfterSet.sessionState?.selectedCandidateId).toBe("candidate-1");
  });

  it("ペンディングIntentの設定と解除ができる", () => {
    const { setPendingIntent, clearPendingIntent } =
      useVoiceRecognitionStore.getState();

    setPendingIntent({
      intentId: "START_RESEARCH",
      confidence: 0.74,
      parameters: { candidateId: "candidate-1" },
      expiresAt: "2025-09-17T02:05:00.000Z",
    });

    expect(useVoiceRecognitionStore.getState().pendingIntent).toMatchObject({
      intentId: "START_RESEARCH",
      confidence: 0.74,
    });

    clearPendingIntent();

    expect(useVoiceRecognitionStore.getState().pendingIntent).toBeNull();
  });

  it("エラーの記録とクリアができる", () => {
    const { setError, clearError } = useVoiceRecognitionStore.getState();

    setError("SSE disconnected");
    expect(useVoiceRecognitionStore.getState().lastError).toBe(
      "SSE disconnected",
    );

    clearError();
    expect(useVoiceRecognitionStore.getState().lastError).toBeNull();
  });

  it("再接続カウンタを増減できる", () => {
    const { incrementReconnectAttempt, resetReconnectAttempt } =
      useVoiceRecognitionStore.getState();

    incrementReconnectAttempt();
    incrementReconnectAttempt();

    expect(useVoiceRecognitionStore.getState().reconnectAttempt).toBe(2);

    resetReconnectAttempt();
    expect(useVoiceRecognitionStore.getState().reconnectAttempt).toBe(0);
  });
});
