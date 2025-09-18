import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const reExecuteUseCaseExecute = vi.fn();

vi.mock("@/shared/useCases/ReExecuteResearchUseCase", () => ({
  createReExecuteResearchUseCase: vi.fn(() => ({
    execute: reExecuteUseCaseExecute,
  })),
}));

describe("POST /api/research/:id/re-execute", () => {
  const now = new Date("2025-09-18T10:10:00.000Z").toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PERPLEXITY_API_KEY", "test-api-key");
    reExecuteUseCaseExecute.mockResolvedValue({
      id: "research-uuid",
      status: "pending",
      revision: 3,
      createdAt: new Date("2025-09-18T10:00:00.000Z").toISOString(),
      updatedAt: now,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("再実行リクエストを受け付ける", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/research/research-uuid/re-execute",
      { method: "POST" },
    );

    const response = await POST(request, { params: { id: "research-uuid" } });
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(reExecuteUseCaseExecute).toHaveBeenCalledWith({
      researchId: "research-uuid",
    });
    expect(data.status).toBe("pending");
    expect(data.revision).toBe(3);
  });

  it("UseCaseでエラーが発生した場合は500を返す", async () => {
    reExecuteUseCaseExecute.mockRejectedValueOnce(new Error("failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/research/research-uuid/re-execute",
      { method: "POST" },
    );

    const response = await POST(request, { params: { id: "research-uuid" } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
