import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ResearchPersistencePort,
  ResearchSnapshot,
  SaveInitialSnapshotInput,
} from "@/shared/useCases/ports/research/persistence";
import { createCreateResearchUseCase } from "./index";

describe("CreateResearchUseCase", () => {
  const now = new Date("2025-09-18T10:00:00.000Z").toISOString();

  const createDeps = () => {
    const saveInitialSnapshotMock = vi
      .fn<(input: SaveInitialSnapshotInput) => Promise<ResearchSnapshot>>()
      .mockResolvedValue({
        id: "research-uuid",
        query: "How does SSE work?",
        status: "pending",
        revision: 1,
        results: [],
        searchResults: [],
        citations: [],
        createdAt: now,
        updatedAt: now,
        lastError: null,
      });
    const persistence: ResearchPersistencePort = {
      saveInitialSnapshot: saveInitialSnapshotMock,
      updateSnapshot: vi.fn(),
      appendEvent: vi.fn(),
      getSnapshot: vi.fn(),
      getEventsSince: vi.fn(),
    };

    const idGenerator = {
      generate: vi.fn().mockReturnValue("research-uuid"),
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

    return { persistence, idGenerator, jobPort, eventPublisher, clock };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("IDを生成し、pendingスナップショットを保存してジョブを投入する", async () => {
    const deps = createDeps();
    const useCase = createCreateResearchUseCase({
      persistence: deps.persistence,
      idGenerator: deps.idGenerator,
      jobPort: deps.jobPort,
      eventPublisher: deps.eventPublisher,
      clock: deps.clock,
    });

    const result = await useCase.execute({
      query: "How does SSE work?",
      selectedText: "Server Sent Events",
      voiceCommand: "deepdive",
    });

    expect(deps.idGenerator.generate).toHaveBeenCalledTimes(1);
    expect(deps.persistence.saveInitialSnapshot).toHaveBeenCalledWith({
      id: "research-uuid",
      query: "How does SSE work?",
      selectedText: "Server Sent Events",
      voiceCommand: "deepdive",
      status: "pending",
      results: [],
      searchResults: [],
      citations: [],
      createdAt: now,
      updatedAt: now,
      lastError: null,
    });

    expect(deps.jobPort.enqueue).toHaveBeenCalledWith({
      researchId: "research-uuid",
      trigger: "create",
    });

    expect(deps.eventPublisher.publish).toHaveBeenCalledWith({
      id: "research-uuid",
      revision: 1,
      type: "status",
      payload: { status: "pending" },
      createdAt: now,
    });

    expect(result).toEqual({
      id: "research-uuid",
      status: "pending",
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
  });
});
