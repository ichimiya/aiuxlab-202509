import { describe, expect, beforeEach, afterEach, vi, it } from "vitest";
import type { VoicePattern } from "@/shared/api/generated/models";

const mockEntry = {
  request: {
    originalQuery: "test query",
    voiceTranscript: "voice",
    voiceCommand: "deepdive" as VoicePattern,
  },
  result: {
    selectedCandidateId: "candidate-1",
    candidates: [
      {
        id: "candidate-1",
        query: "optimized query",
        coverageScore: 0.9,
        coverageExplanation: "",
        addedAspects: [],
        improvementReason: "because",
        suggestedFollowups: [],
      },
    ],
  },
};

describe("queryOptimizationSessionRepository", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    const mod = await import("./queryOptimizationSessionRepository");
    await mod.__dangerouslyResetQueryOptimizationRedisClient();
    vi.clearAllMocks();
  });

  it("REDIS_URL が未設定の場合、Redis クライアントを生成せずにメモリストアを利用する", async () => {
    const redisCtor = vi.fn().mockReturnValue({
      set: vi.fn(),
      get: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    });
    vi.doMock("ioredis", () => ({
      __esModule: true,
      default: redisCtor,
    }));

    const mod = await import("./queryOptimizationSessionRepository");
    const repo = mod.createQueryOptimizationSessionRepository();

    await repo.initializeSession("session-1", mockEntry, 60);
    const history = await repo.getSessionHistory("session-1");

    expect(redisCtor).not.toHaveBeenCalled();
    expect(history).toHaveLength(1);
    expect(history[0].request.originalQuery).toBe("test query");
    expect(history[0].result?.candidates[0]?.query).toBe("optimized query");
  });

  it("Redis 接続に失敗した場合、メモリストアにフォールバックする", async () => {
    process.env.REDIS_URL = "redis://example:6379";
    const setMock = vi.fn();
    const getMock = vi.fn();

    const redisCtor = vi.fn().mockImplementation(() => ({
      set: setMock,
      get: getMock,
      disconnect: vi.fn(),
      connect: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    }));

    vi.doMock("ioredis", () => ({
      __esModule: true,
      default: redisCtor,
    }));

    const mod = await import("./queryOptimizationSessionRepository");
    const repo = mod.createQueryOptimizationSessionRepository();

    await expect(
      repo.initializeSession("session-2", mockEntry, 60),
    ).resolves.toBeUndefined();
    const history = await repo.getSessionHistory("session-2");

    expect(redisCtor).toHaveBeenCalledTimes(1);
    expect(setMock).not.toHaveBeenCalled();
    expect(history).toHaveLength(1);
  });

  it("Redis が利用可能な場合、履歴を永続化して取得できる", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const store = new Map<string, string>();

    const redisCtor = vi.fn().mockImplementation(() => ({
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return "OK";
      }),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      disconnect: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
    }));

    vi.doMock("ioredis", () => ({
      __esModule: true,
      default: redisCtor,
    }));

    const mod = await import("./queryOptimizationSessionRepository");
    const repo = mod.createQueryOptimizationSessionRepository();

    await repo.initializeSession("session-redis", mockEntry, 60);
    const entry2 = {
      request: {
        originalQuery: "test query 2",
      },
      result: {
        selectedCandidateId: "candidate-2",
        candidates: [
          {
            id: "candidate-2",
            query: "second query",
            coverageScore: 0.8,
            coverageExplanation: "",
            addedAspects: [],
            improvementReason: "",
            suggestedFollowups: [],
          },
        ],
      },
    };
    await repo.appendEntry("session-redis", entry2, 60);
    const history = await repo.getSessionHistory("session-redis");

    expect(redisCtor).toHaveBeenCalledTimes(1);
    expect(history).toHaveLength(2);
    expect(history[0].request.originalQuery).toBe("test query");
    expect(history[1].request.originalQuery).toBe("test query 2");
  });
});
