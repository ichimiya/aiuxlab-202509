import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ResearchEventType } from "@/shared/useCases/ports/research/persistence";

describe("researchRepository", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("ioredis");
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    const mod = await import("./researchRepository");
    if ("__dangerouslyResetResearchRedisClient" in mod) {
      await mod.__dangerouslyResetResearchRedisClient();
    }
    vi.clearAllMocks();
  });

  it("saveInitialSnapshot で pending スナップショットを保存し revision=1 で取得できる", async () => {
    const { createResearchRepository } = await import("./researchRepository");
    const repo = createResearchRepository();

    const now = new Date("2025-09-18T10:00:00.000Z").toISOString();

    await repo.saveInitialSnapshot({
      id: "research-1",
      query: "AI research",
      status: "pending",
      results: [],
      searchResults: [],
      citations: [],
      createdAt: now,
      updatedAt: now,
    });

    const snapshot = await repo.getSnapshot("research-1");

    expect(snapshot).not.toBeNull();
    expect(snapshot?.id).toBe("research-1");
    expect(snapshot?.status).toBe("pending");
    expect(snapshot?.revision).toBe(1);
    expect(snapshot?.createdAt).toBe(now);
    expect(snapshot?.updatedAt).toBe(now);
  });

  it("updateSnapshot で revision がインクリメントされ status が更新される", async () => {
    const { createResearchRepository } = await import("./researchRepository");
    const repo = createResearchRepository();

    const createdAt = new Date("2025-09-18T10:00:00.000Z").toISOString();
    const completedAt = new Date("2025-09-18T10:05:00.000Z").toISOString();

    await repo.saveInitialSnapshot({
      id: "research-2",
      query: "SSE design",
      status: "pending",
      results: [],
      searchResults: [],
      citations: [],
      createdAt,
      updatedAt: createdAt,
    });

    const updated = await repo.updateSnapshot({
      id: "research-2",
      status: "completed",
      results: [
        {
          id: "result-1",
          content: "answer",
          source: "perplexity",
          relevanceScore: 1,
        },
      ],
      updatedAt: completedAt,
    });

    expect(updated.revision).toBe(2);
    expect(updated.status).toBe("completed");
    expect(updated.results).toHaveLength(1);

    const snapshot = await repo.getSnapshot("research-2");
    expect(snapshot?.revision).toBe(2);
    expect(snapshot?.status).toBe("completed");
  });

  it("appendEvent / getEventsSince で指定revision以降のイベントを取得できる", async () => {
    const { createResearchRepository } = await import("./researchRepository");
    const repo = createResearchRepository();

    const createdAt = new Date("2025-09-18T10:00:00.000Z").toISOString();
    const statusChangedAt = new Date("2025-09-18T10:02:00.000Z").toISOString();

    await repo.saveInitialSnapshot({
      id: "research-3",
      query: "redis persistence",
      status: "pending",
      results: [],
      searchResults: [],
      citations: [],
      createdAt,
      updatedAt: createdAt,
    });

    await repo.appendEvent({
      id: "research-3",
      revision: 2,
      type: "status" satisfies ResearchEventType,
      payload: { status: "completed" },
      createdAt: statusChangedAt,
    });

    const events = await repo.getEventsSince("research-3", 1);

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("status");
    expect(events[0]?.revision).toBe(2);
    expect(events[0]?.payload).toEqual({ status: "completed" });
  });
});
