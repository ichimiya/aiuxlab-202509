import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ResearchPersistencePort,
  ResearchSnapshot,
} from "@/shared/useCases/ports/research/persistence";
import { createReExecuteResearchUseCase } from "./index";

describe("ReExecuteResearchUseCase", () => {
  const now = new Date("2025-09-18T10:10:00.000Z").toISOString();

  const createDeps = (snapshot?: Partial<ResearchSnapshot>) => {
    const baseSnapshot: ResearchSnapshot = {
      id: "research-uuid",
      query: "Explain Redis streams",
      selectedText: "redis",
      voiceCommand: { type: "deepdive" },
      status: "completed",
      revision: 2,
      results: [
        {
          id: "research-uuid",
          content: "Redis Streams analysis",
          source: "perplexity",
          relevanceScore: 1,
        },
      ],
      searchResults: [],
      citations: [],
      createdAt: new Date("2025-09-18T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2025-09-18T10:05:00.000Z").toISOString(),
      lastError: null,
      ...snapshot,
    };

    const persistence: ResearchPersistencePort = {
      saveInitialSnapshot: vi.fn(),
      updateSnapshot: vi.fn().mockResolvedValue({
        ...baseSnapshot,
        status: "pending",
        revision: baseSnapshot.revision + 1,
        results: [],
        searchResults: [],
        citations: [],
        updatedAt: now,
        lastError: null,
      }),
      appendEvent: vi.fn(),
      getSnapshot: vi.fn().mockResolvedValue(baseSnapshot),
      getEventsSince: vi.fn(),
    };

    const jobPort = {
      enqueue: vi.fn().mockResolvedValue(undefined),
    };

    const eventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    const clock = {
      now: vi.fn().mockReturnValue(now),
    };

    return { baseSnapshot, persistence, jobPort, eventPublisher, clock };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("既存スナップショットをpendingに戻し、ジョブを再投入する", async () => {
    const deps = createDeps();
    const useCase = createReExecuteResearchUseCase({
      persistence: deps.persistence,
      jobPort: deps.jobPort,
      eventPublisher: deps.eventPublisher,
      clock: deps.clock,
    });

    const result = await useCase.execute({ researchId: "research-uuid" });

    expect(deps.persistence.getSnapshot).toHaveBeenCalledWith("research-uuid");
    expect(deps.persistence.updateSnapshot).toHaveBeenCalledWith({
      id: "research-uuid",
      status: "pending",
      results: [],
      searchResults: [],
      citations: [],
      updatedAt: now,
      lastError: null,
    });

    expect(deps.jobPort.enqueue).toHaveBeenCalledWith({
      researchId: "research-uuid",
      trigger: "re-execute",
    });

    expect(deps.eventPublisher.publish).toHaveBeenCalledWith({
      id: "research-uuid",
      revision: result.revision,
      type: "status",
      payload: { status: "pending" },
      createdAt: now,
    });

    expect(result.status).toBe("pending");
    expect(result.revision).toBeGreaterThan(2);
  });

  it("スナップショットが存在しない場合はエラーを投げる", async () => {
    const deps = createDeps();
    deps.persistence.getSnapshot = vi.fn().mockResolvedValue(null);

    const useCase = createReExecuteResearchUseCase({
      persistence: deps.persistence,
      jobPort: deps.jobPort,
      eventPublisher: deps.eventPublisher,
      clock: deps.clock,
    });

    await expect(
      useCase.execute({ researchId: "missing-id" }),
    ).rejects.toThrowError(/not found/i);

    expect(deps.jobPort.enqueue).not.toHaveBeenCalled();
  });
});
