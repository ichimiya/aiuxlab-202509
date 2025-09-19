import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VoiceEventJob } from "@/shared/useCases/ports/voice";
import { createVoiceEventProcessor } from "./processor";

const executeMock = vi.fn();
const initializeSessionMock = vi.fn();
const appendEntryMock = vi.fn();
const getSessionHistoryMock = vi.fn();
const publishMock = vi.fn();
const sessionStoreSetMock = vi.fn();
const sessionStoreGetMock = vi.fn();
const classifyMock = vi.fn();
const executeResearchMock = vi.fn();

describe("processVoiceEvent", () => {
  beforeEach(() => {
    executeMock.mockReset();
    executeResearchMock.mockReset();
    initializeSessionMock.mockReset();
    appendEntryMock.mockReset();
    getSessionHistoryMock.mockReset();
    publishMock.mockReset();
    sessionStoreSetMock.mockReset();
    sessionStoreGetMock.mockReset();
    classifyMock.mockReset();
    initializeSessionMock.mockResolvedValue(undefined);
    appendEntryMock.mockResolvedValue(undefined);
    publishMock.mockResolvedValue(undefined);
    sessionStoreSetMock.mockResolvedValue(undefined);
    sessionStoreGetMock.mockResolvedValue(null);
    getSessionHistoryMock.mockResolvedValue([]);
    classifyMock.mockResolvedValue({
      intentId: "OPTIMIZE_QUERY_APPEND",
      confidence: 0.82,
      parameters: { partialText: "サッカーチーム" },
    });
    executeResearchMock.mockResolvedValue({
      id: "research-1",
      prompt: "",
      headline: "",
      highlights: [],
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  const baseJob: VoiceEventJob = {
    sessionId: "session-1",
    transcript: "サッカーチームを調べたい",
    confidence: 0.84,
    isFinal: true,
    pattern: "deepdive",
    timestamp: "2025-09-18T12:00:00.000Z",
    metadata: {
      locale: "ja-JP",
      device: "web",
      chunkSeq: 1,
    },
  };

  it("LLMインテントがautoのクエリ最適化なら最適化ユースケースを実行しセッション更新を通知する", async () => {
    getSessionHistoryMock.mockResolvedValueOnce([]);
    executeMock.mockResolvedValueOnce({
      candidates: [
        {
          id: "candidate-1",
          query: "サッカーチーム 調査 2025",
          coverageScore: 0.9,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ],
      evaluationSummary: "最新シーズン中心に整理",
      recommendedCandidateId: "candidate-1",
    });

    const processor = createVoiceEventProcessor({
      optimizeUseCase: { execute: executeMock },
      executeResearchUseCase: { execute: executeResearchMock },
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        get: sessionStoreGetMock,
        set: sessionStoreSetMock,
      },
      intentClassifier: {
        classify: classifyMock,
      },
    });

    await processor(baseJob);

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        originalQuery: "サッカーチームを調べたい",
        sessionId: "session-1",
      }),
    );

    expect(initializeSessionMock).toHaveBeenCalledTimes(1);
    expect(appendEntryMock).not.toHaveBeenCalled();

    expect(sessionStoreSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        status: "ready",
        candidates: expect.any(Array),
      }),
    );

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session_update",
        sessionId: "session-1",
      }),
    );
    expect(executeResearchMock).not.toHaveBeenCalled();
  });

  it("インテントがconfirm帯ならpendingIntentを保存しintent_confirmationを通知する", async () => {
    classifyMock.mockResolvedValueOnce({
      intentId: "START_RESEARCH",
      confidence: 0.62,
      parameters: { candidateId: "candidate-99" },
    });
    sessionStoreGetMock.mockResolvedValueOnce({
      sessionId: "session-1",
      status: "ready",
      candidates: [],
      lastUpdatedAt: new Date().toISOString(),
    });

    const processor = createVoiceEventProcessor({
      optimizeUseCase: { execute: executeMock },
      executeResearchUseCase: { execute: executeResearchMock },
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        get: sessionStoreGetMock,
        set: sessionStoreSetMock,
      },
      intentClassifier: {
        classify: classifyMock,
      },
    });

    await processor(baseJob);

    const pendingIntent = sessionStoreSetMock.mock.calls.find(
      (call) => call[0]?.pendingIntent,
    )?.[0].pendingIntent;

    expect(pendingIntent).toMatchObject({
      intentId: "START_RESEARCH",
      confidence: 0.62,
      parameters: { candidateId: "candidate-99" },
    });

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "intent_confirmation",
        sessionId: "session-1",
      }),
    );
    expect(executeMock).not.toHaveBeenCalled();
    expect(executeResearchMock).not.toHaveBeenCalled();
  });

  it("confirm帯で未サポートのインテントならエラーを通知する", async () => {
    classifyMock.mockResolvedValueOnce({
      intentId: "CANCEL_OPTIMIZATION",
      confidence: 0.58,
      parameters: {},
    });

    const processor = createVoiceEventProcessor({
      optimizeUseCase: { execute: executeMock },
      executeResearchUseCase: { execute: executeResearchMock },
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        get: sessionStoreGetMock,
        set: sessionStoreSetMock,
      },
      intentClassifier: {
        classify: classifyMock,
      },
    });

    await processor(baseJob);

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        sessionId: "session-1",
      }),
    );
    expect(executeMock).not.toHaveBeenCalled();
    expect(executeResearchMock).not.toHaveBeenCalled();
    expect(sessionStoreSetMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ pendingIntent: expect.anything() }),
    );
  });

  it("インテントがrejectならエラーイベントを通知しユースケースを呼び出さない", async () => {
    classifyMock.mockResolvedValueOnce({
      intentId: "START_RESEARCH",
      confidence: 0.2,
      parameters: {},
    });

    const processor = createVoiceEventProcessor({
      optimizeUseCase: { execute: executeMock },
      executeResearchUseCase: { execute: executeResearchMock },
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        get: sessionStoreGetMock,
        set: sessionStoreSetMock,
      },
      intentClassifier: {
        classify: classifyMock,
      },
    });

    await processor(baseJob);

    expect(executeMock).not.toHaveBeenCalled();
    expect(executeResearchMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        sessionId: "session-1",
      }),
    );
  });

  it("既存セッション履歴があればクエリをマージして最適化に渡す", async () => {
    getSessionHistoryMock.mockResolvedValueOnce([
      {
        request: {
          originalQuery: "サッカーチームを調べたい",
          voiceTranscript: "サッカーチームを調べたい",
          voiceCommand: "deepdive",
        },
        result: {
          selectedCandidateId: "candidate-1",
          recommendedCandidateId: "candidate-1",
          candidates: [
            {
              id: "candidate-1",
              query: "サッカーチーム 調査",
              coverageScore: 0.9,
              coverageExplanation: "",
              addedAspects: [],
              improvementReason: "",
              suggestedFollowups: [],
            },
          ],
        },
      },
    ]);

    executeMock.mockResolvedValueOnce({
      candidates: [
        {
          id: "candidate-2",
          query: "サッカーチーム 東京 2025",
          coverageScore: 0.88,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ],
      evaluationSummary: "東京エリア中心に整理",
      recommendedCandidateId: "candidate-2",
    });

    const job: VoiceEventJob = {
      ...baseJob,
      transcript: "東京都",
      metadata: { ...baseJob.metadata, chunkSeq: 2 },
    };

    const processor = createVoiceEventProcessor({
      optimizeUseCase: { execute: executeMock },
      executeResearchUseCase: { execute: executeResearchMock },
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        get: sessionStoreGetMock,
        set: sessionStoreSetMock,
      },
      intentClassifier: {
        classify: classifyMock,
      },
    });

    await processor(job);

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        originalQuery: expect.stringContaining("東京都"),
        sessionHistory: expect.any(Array),
      }),
    );

    expect(appendEntryMock).toHaveBeenCalledTimes(1);
    expect(initializeSessionMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "session-1" }),
    );
  });

  it("START_RESEARCHがauto帯ならExecuteResearchUseCaseを呼び出してセッション更新を通知する", async () => {
    classifyMock.mockResolvedValueOnce({
      intentId: "START_RESEARCH",
      confidence: 0.92,
      parameters: { candidateId: "candidate-2" },
    });

    sessionStoreGetMock.mockResolvedValueOnce({
      sessionId: "session-1",
      status: "ready",
      candidates: [
        {
          id: "candidate-2",
          query: "サッカーチーム 東京 2025",
          coverageScore: 0.88,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ].map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
        source: "llm" as const,
      })),
      selectedCandidateId: "candidate-2",
      currentQuery: "サッカーチーム 東京",
      lastUpdatedAt: new Date().toISOString(),
    });

    const processor = createVoiceEventProcessor({
      optimizeUseCase: { execute: executeMock },
      executeResearchUseCase: { execute: executeResearchMock },
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        get: sessionStoreGetMock,
        set: sessionStoreSetMock,
      },
      intentClassifier: {
        classify: classifyMock,
      },
    });

    await processor(baseJob);

    expect(executeResearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.any(String),
      }),
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session_update",
        sessionId: "session-1",
      }),
    );
  });

  it("未実装インテントがauto帯で返ってきたらエラーを通知する", async () => {
    classifyMock.mockResolvedValueOnce({
      intentId: "CANCEL_OPTIMIZATION",
      confidence: 0.85,
      parameters: {},
    });

    const processor = createVoiceEventProcessor({
      optimizeUseCase: { execute: executeMock },
      executeResearchUseCase: { execute: executeResearchMock },
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        get: sessionStoreGetMock,
        set: sessionStoreSetMock,
      },
      intentClassifier: {
        classify: classifyMock,
      },
    });

    await processor(baseJob);

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        sessionId: "session-1",
      }),
    );
    expect(executeMock).not.toHaveBeenCalled();
    expect(executeResearchMock).not.toHaveBeenCalled();
  });
});
