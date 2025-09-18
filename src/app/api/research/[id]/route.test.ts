import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const getSnapshot = vi.fn();

vi.mock("@/shared/infrastructure/redis/researchRepository", () => ({
  createResearchRepository: vi.fn(() => ({
    getSnapshot,
  })),
}));

describe("GET /api/research/:id", () => {
  const snapshot = {
    id: "research-uuid",
    status: "completed",
    revision: 2,
    query: "Redis Streams",
    results: [],
    searchResults: [],
    citations: [],
    createdAt: new Date("2025-09-18T10:00:00.000Z").toISOString(),
    updatedAt: new Date("2025-09-18T10:05:00.000Z").toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getSnapshot.mockResolvedValue(snapshot);
  });

  it("スナップショットを返す", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/research/research-uuid",
    );
    const response = await GET(request, { params: { id: "research-uuid" } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getSnapshot).toHaveBeenCalledWith("research-uuid");
    expect(data).toEqual(snapshot);
  });

  it("存在しない場合は404を返す", async () => {
    getSnapshot.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/research/missing",
    );
    const response = await GET(request, { params: { id: "missing" } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });
});
