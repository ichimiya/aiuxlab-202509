import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VoiceEventJob } from "@/shared/useCases/ports/voice";
import { createVoiceEventProcessor } from "./processor";

const executeMock = vi.fn();
const initializeSessionMock = vi.fn();
const appendEntryMock = vi.fn();
const getSessionHistoryMock = vi.fn();
const publishMock = vi.fn();
const sessionStoreSetMock = vi.fn();

describe("processVoiceEvent", () => {
  beforeEach(() => {
    executeMock.mockReset();
    initializeSessionMock.mockReset();
    appendEntryMock.mockReset();
    getSessionHistoryMock.mockReset();
    publishMock.mockReset();
    sessionStoreSetMock.mockReset();
    initializeSessionMock.mockResolvedValue(undefined);
    appendEntryMock.mockResolvedValue(undefined);
    publishMock.mockResolvedValue(undefined);
    sessionStoreSetMock.mockResolvedValue(undefined);
    getSessionHistoryMock.mockResolvedValue([]);
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

  it("新規セッションを初期化し、最適化結果をSSE通知する", async () => {
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
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        set: sessionStoreSetMock,
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
  });

  it("既存セッションに対してクエリをマージして最適化する", async () => {
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
      sessionRepository: {
        initializeSession: initializeSessionMock,
        appendEntry: appendEntryMock,
        getSessionHistory: getSessionHistoryMock,
      },
      notificationAdapter: {
        publish: publishMock,
      },
      sessionStore: {
        set: sessionStoreSetMock,
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
});
