import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const createUseCaseExecute = vi.fn();

vi.mock("@/shared/useCases/CreateResearchUseCase", () => ({
  createCreateResearchUseCase: vi.fn(() => ({
    execute: createUseCaseExecute,
  })),
}));

describe("POST /api/research (async)", () => {
  const now = new Date("2025-09-18T10:00:00.000Z").toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PERPLEXITY_API_KEY", "test-api-key");
    createUseCaseExecute.mockResolvedValue({
      id: "research-uuid",
      status: "pending",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("即時にpendingレスポンスを返し、非同期ジョブをキックする", async () => {
    const requestBody = {
      query: "What is Redis Streams?",
      selectedText: "Redis",
      voiceCommand: "deepdive",
    };

    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data).toEqual({
      id: "research-uuid",
      status: "pending",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });

    expect(createUseCaseExecute).toHaveBeenCalledWith({
      query: "What is Redis Streams?",
      selectedText: "Redis",
      voiceCommand: "deepdive",
    });
  });

  it("ボディのバリデーションエラーは400を返す", async () => {
    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: JSON.stringify({ query: "" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("APIキー未設定時は500エラーを返す", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "");

    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: JSON.stringify({ query: "test" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("API_KEY_MISSING");
    expect(createUseCaseExecute).not.toHaveBeenCalled();
  });

  it("UseCaseが例外を投げた場合は500を返す", async () => {
    createUseCaseExecute.mockRejectedValueOnce(new Error("unexpected"));

    const request = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      body: JSON.stringify({ query: "test" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
