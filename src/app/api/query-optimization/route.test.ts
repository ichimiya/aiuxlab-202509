import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// UseCaseをモック
vi.mock("@/shared/useCases", () => ({
  createOptimizeQueryUseCase: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({
      optimizedQuery: "AIの潜在的リスクと安全対策の包括的評価",
      addedAspects: ["規制動向", "事故事例"],
      improvementReason: "曖昧さの解消と具体性の付与",
      confidence: 0.9,
      suggestedFollowups: ["国際比較"],
    }),
  })),
}));

import { POST } from "./route";

describe("POST /api/query-optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効なリクエストで最適化を実行する", async () => {
    const body = {
      originalQuery: "AIって危険？",
      selectedText: "[自動運転事故のニュース記事の抜粋]",
      voiceCommand: "deepdive",
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
    expect(data.optimizedQuery).toMatch(/安全/);
    expect(Array.isArray(data.addedAspects)).toBe(true);
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
