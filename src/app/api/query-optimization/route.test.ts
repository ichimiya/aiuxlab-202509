import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// UseCaseをモック
const useCaseExecuteMock = vi.fn().mockResolvedValue({
  candidates: [
    {
      id: "candidate-1",
      query: "AI リスク 安全対策 国際比較",
      coverageScore: 0.92,
      coverageExplanation: "安全対策と比較軸を追加",
      addedAspects: ["安全対策", "国際比較"],
      improvementReason: "曖昧さの解消と多角化",
      suggestedFollowups: ["各国の規制動向"],
    },
    {
      id: "candidate-2",
      query: "AI 事故 重大事例 リスク評価",
      coverageScore: 0.81,
      coverageExplanation: "事故事例と評価指標を強化",
      addedAspects: ["重大事例", "評価指標"],
      improvementReason: "事故観点の補強",
      suggestedFollowups: ["産業別の事故統計"],
    },
    {
      id: "candidate-3",
      query: "AI リスク 対策 法規制 比較",
      coverageScore: 0.74,
      coverageExplanation: "法規制観点を追加",
      addedAspects: ["法規制"],
      improvementReason: "規制観点の明示",
      suggestedFollowups: ["国際標準の比較"],
    },
  ],
  evaluationSummary: "安全対策・事故事例・規制の3観点から網羅",
  recommendedCandidateId: "candidate-1",
});

vi.mock("@/shared/useCases", () => ({
  createOptimizeQueryUseCase: vi.fn(() => ({
    execute: useCaseExecuteMock,
  })),
}));

const sessionRepoMock = {
  initializeSession: vi.fn(),
  appendEntry: vi.fn(),
  getSessionHistory: vi.fn(),
};

vi.mock(
  "@/shared/infrastructure/redis/queryOptimizationSessionRepository",
  () => ({
    createQueryOptimizationSessionRepository: () => sessionRepoMock,
  }),
);

import { POST } from "./route";

describe("POST /api/query-optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCaseExecuteMock.mockClear();
    sessionRepoMock.initializeSession.mockReset();
    sessionRepoMock.appendEntry.mockReset();
    sessionRepoMock.getSessionHistory.mockReset();
    sessionRepoMock.initializeSession.mockResolvedValue(undefined);
    sessionRepoMock.appendEntry.mockResolvedValue(undefined);
    sessionRepoMock.getSessionHistory.mockResolvedValue([]);
  });

  it("有効なリクエストで最適化を実行する", async () => {
    const body = {
      originalQuery: "AIって危険？",
      selectedText: "[自動運転事故のニュース記事の抜粋]",
      voiceCommand: "deepdive",
      voiceTranscript: "AIって危険？安全対策を教えて",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/query-optimization",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(typeof data.sessionId).toBe("string");
    expect(Array.isArray(data.result.candidates)).toBe(true);
    expect(data.result.candidates).toHaveLength(3);
    expect(sessionRepoMock.initializeSession).toHaveBeenCalledWith(
      data.sessionId,
      expect.objectContaining({
        request: expect.objectContaining({ originalQuery: body.originalQuery }),
        result: expect.any(Object),
      }),
      600,
    );
  });

  it("既存セッションIDで履歴を読み込み、新規エントリを追加する", async () => {
    const sessionId = "session-123";
    sessionRepoMock.getSessionHistory.mockResolvedValueOnce([
      {
        request: {
          originalQuery: "AIのリスク",
          voiceCommand: "deepdive",
          voiceTranscript: "AIのリスクを詳しく",
        },
        result: {
          candidates: [],
        },
      },
    ]);

    const body = {
      sessionId,
      originalQuery: "AIの安全対策",
      voiceTranscript: "AIの安全対策を教えて",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/query-optimization",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessionId).toBe(sessionId);
    expect(sessionRepoMock.getSessionHistory).toHaveBeenCalledWith(sessionId);
    expect(useCaseExecuteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        originalQuery: body.originalQuery,
        sessionHistory: expect.arrayContaining([
          expect.objectContaining({
            request: expect.objectContaining({
              originalQuery: "AIのリスク",
            }),
          }),
        ]),
      }),
    );
    expect(sessionRepoMock.appendEntry).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({
        request: expect.objectContaining({ originalQuery: body.originalQuery }),
        result: expect.any(Object),
      }),
      600,
    );
  });

  it("無効なJSONは400エラーを返す", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/query-optimization",
      {
        method: "POST",
        body: "{not-json",
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_JSON");
  });

  it("バリデーションエラーは400を返す", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/query-optimization",
      {
        method: "POST",
        body: JSON.stringify({ originalQuery: "" }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});
