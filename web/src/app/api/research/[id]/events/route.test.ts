import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const { createEventStream } = vi.hoisted(() => ({
  createEventStream: vi.fn(),
}));

vi.mock("@/shared/infrastructure/events/researchEventStream", () => ({
  createResearchEventStream: createEventStream,
}));

describe("GET /api/research/:id/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createEventStream.mockReturnValue(
      new Response("data: test\n\n", {
        headers: {
          "content-type": "text/event-stream",
          connection: "keep-alive",
          "cache-control": "no-cache",
        },
      }),
    );
  });

  it("SSEレスポンスを返す", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/research/research-uuid/events",
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "research-uuid" }),
    });

    expect(createEventStream).toHaveBeenCalledWith(
      expect.objectContaining({ researchId: "research-uuid" }),
    );
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("connection")).toBe("keep-alive");
    expect(response.headers.get("cache-control")).toMatch(/no-cache/);
  });
});
