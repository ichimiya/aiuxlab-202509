import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ResearchPersistencePort,
  ResearchSnapshot,
  UpdateSnapshotInput,
} from "@/shared/useCases/ports/research/persistence";
import { ProcessResearchJob } from "./index";

describe("ProcessResearchJob", () => {
  const now = new Date("2025-09-18T10:05:00.000Z").toISOString();

  const createDeps = () => {
    const getSnapshotMock =
      vi.fn<(researchId: string) => Promise<ResearchSnapshot | null>>();
    const updateSnapshotMock =
      vi.fn<(input: UpdateSnapshotInput) => Promise<ResearchSnapshot>>();
    const appendEventMock = vi.fn();
    const persistence: ResearchPersistencePort = {
      saveInitialSnapshot: vi.fn(),
      updateSnapshot: updateSnapshotMock,
      appendEvent: appendEventMock,
      getSnapshot: getSnapshotMock,
      getEventsSince: vi.fn(),
    };

    const eventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    const executeResearchUseCase = {
      execute: vi.fn(),
    };

    const clock = {
      now: vi.fn().mockReturnValue(now),
    };

    return {
      persistence,
      eventPublisher,
      executeResearchUseCase,
      clock,
      mocks: {
        getSnapshot: getSnapshotMock,
        updateSnapshot: updateSnapshotMock,
        appendEvent: appendEventMock,
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Perplexity結果を保存し、completedイベントをPublishする", async () => {
    const deps = createDeps();
    const initialSnapshot: ResearchSnapshot = {
      id: "research-uuid",
      query: "Explain Redis streams",
      status: "pending",
      revision: 1,
      results: [],
      searchResults: [],
      citations: [],
      createdAt: new Date("2025-09-18T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2025-09-18T10:00:00.000Z").toISOString(),
      lastError: null,
      selectedText: "redis",
      voiceCommand: "deepdive",
    };

    deps.mocks.getSnapshot.mockResolvedValue(initialSnapshot);

    deps.executeResearchUseCase.execute = vi.fn().mockResolvedValue({
      id: "research-uuid",
      query: initialSnapshot.query,
      status: "completed",
      results: [
        {
          id: "research-uuid",
          content: "Redis Streams allow fan-out consumption",
          source: "perplexity",
          relevanceScore: 1,
        },
      ],
      searchResults: [],
      citations: [],
      createdAt: initialSnapshot.createdAt,
      updatedAt: now,
    });

    deps.mocks.updateSnapshot.mockResolvedValue({
      ...initialSnapshot,
      status: "completed",
      results: [
        {
          id: "research-uuid",
          content: "Redis Streams allow fan-out consumption",
          source: "perplexity",
          relevanceScore: 1,
        },
      ],
      revision: 2,
      updatedAt: now,
    });

    const job = new ProcessResearchJob({
      persistence: deps.persistence,
      eventPublisher: deps.eventPublisher,
      executeResearchUseCase: deps.executeResearchUseCase as never,
      clock: deps.clock,
    });

    await job.handle({ researchId: "research-uuid" });

    expect(deps.mocks.getSnapshot).toHaveBeenCalledWith("research-uuid");
    expect(deps.executeResearchUseCase.execute).toHaveBeenCalledWith({
      query: "Explain Redis streams",
      selectedText: "redis",
      voiceCommand: "deepdive",
      researchId: "research-uuid",
    });

    expect(deps.mocks.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "research-uuid",
        status: "completed",
        results: [
          expect.objectContaining({
            id: "research-uuid",
            content: "Redis Streams allow fan-out consumption",
            source: "perplexity",
            relevanceScore: 1,
          }),
        ],
        searchResults: [],
        citations: [],
        updatedAt: now,
        lastError: null,
      }),
    );

    expect(deps.eventPublisher.publish).toHaveBeenCalledWith({
      id: "research-uuid",
      revision: 2,
      type: "status",
      payload: { status: "completed" },
      createdAt: now,
    });
  });

  it("Perplexityでエラーが発生した場合、failedに遷移しエラーイベントをPublishする", async () => {
    const deps = createDeps();
    const initialSnapshot: ResearchSnapshot = {
      id: "research-uuid",
      query: "Explain Redis streams",
      status: "pending",
      revision: 1,
      results: [],
      searchResults: [],
      citations: [],
      createdAt: new Date("2025-09-18T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2025-09-18T10:00:00.000Z").toISOString(),
      lastError: null,
    };

    deps.mocks.getSnapshot.mockResolvedValue(initialSnapshot);

    const upstreamError = new Error("Perplexity timeout");
    deps.executeResearchUseCase.execute = vi
      .fn()
      .mockRejectedValue(upstreamError);

    deps.mocks.updateSnapshot.mockResolvedValue({
      ...initialSnapshot,
      status: "failed",
      revision: 2,
      updatedAt: now,
      lastError: { message: upstreamError.message },
    });

    const job = new ProcessResearchJob({
      persistence: deps.persistence,
      eventPublisher: deps.eventPublisher,
      executeResearchUseCase: deps.executeResearchUseCase as never,
      clock: deps.clock,
    });

    await job.handle({ researchId: "research-uuid" });

    expect(deps.mocks.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "research-uuid",
        status: "failed",
        results: [],
        searchResults: [],
        citations: [],
        updatedAt: now,
        lastError: { message: "Perplexity timeout" },
      }),
    );

    expect(deps.eventPublisher.publish).toHaveBeenCalledWith({
      id: "research-uuid",
      revision: 2,
      type: "error",
      payload: { message: "Perplexity timeout" },
      createdAt: now,
    });
  });
});
