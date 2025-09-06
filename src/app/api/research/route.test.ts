import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// ResearchServiceをモック
vi.mock("@/shared/api/external/perplexity", () => ({
  ResearchService: vi.fn().mockImplementation(() => ({
    executeResearch: vi.fn().mockResolvedValue({
      id: "research-123",
      query: "test query",
      status: "completed",
      results: [
        {
          id: "result-1",
          content: "Test result content",
          source: "Perplexity AI",
          relevanceScore: 0.8,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  })),
}));

describe("POST /api/research", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数をモック
    vi.stubEnv("PERPLEXITY_API_KEY", "test-api-key");
  });

  it("有効なリクエストでリサーチを実行する", async () => {
    const requestBody = {
      query: "artificial intelligence",
      selectedText: "AI technology",
      voiceCommand: "deepdive",
    };

    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("research-123");
    expect(data.query).toBe("test query");
    expect(data.status).toBe("completed");
  });

  it("無効なJSONは400エラーを返す", async () => {
    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: "invalid json",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe("無効なJSONです");
    expect(data.code).toBe("INVALID_JSON");
  });

  it("空のクエリは400エラーを返す", async () => {
    const requestBody = { query: "" };

    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
    // Zodのmin(1)エラーメッセージを期待
    expect(data.message).toContain("Too small");
  });

  it("APIキーが設定されていない場合は500エラーを返す", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "");

    const requestBody = { query: "test query" };
    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe("Perplexity API key is not configured");
    expect(data.code).toBe("API_KEY_MISSING");
  });
});
