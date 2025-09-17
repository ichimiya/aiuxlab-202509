import type { QueryOptimizationSessionEntry } from "@/shared/domain/queryOptimization/services";

type RedisLikeClient = {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: "EX",
    ttlSeconds?: number,
  ): Promise<unknown>;
  disconnect?: () => void;
};

type QueryOptimizationSessionStore = {
  history: QueryOptimizationSessionEntry[];
};

const SESSION_KEY_PREFIX = "qo:session:";

let redisClient: RedisLikeClient | undefined;
let inMemoryStore: Map<string, QueryOptimizationSessionStore> | undefined;

async function createRedisClient(): Promise<RedisLikeClient> {
  if (redisClient) return redisClient;

  try {
    const { default: Redis } = await import("ioredis");
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
    });
    redisClient = client as unknown as RedisLikeClient;
    return redisClient;
  } catch (error) {
    console.warn(
      "ioredis が見つからないため、クエリ最適化セッションをメモリに保存します。",
      error,
    );
    if (!inMemoryStore) {
      inMemoryStore = new Map();
    }
    redisClient = {
      async get(key: string) {
        const store = inMemoryStore!.get(key);
        return store ? JSON.stringify(store) : null;
      },
      async set(key: string, value: string) {
        inMemoryStore!.set(key, JSON.parse(value));
      },
      disconnect() {
        inMemoryStore?.clear();
      },
    };
    return redisClient;
  }
}

function buildSessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

export interface QueryOptimizationSessionRepository {
  initializeSession(
    sessionId: string,
    entry: QueryOptimizationSessionEntry,
    ttlSeconds: number,
  ): Promise<void>;
  appendEntry(
    sessionId: string,
    entry: QueryOptimizationSessionEntry,
    ttlSeconds: number,
  ): Promise<void>;
  getSessionHistory(
    sessionId: string,
  ): Promise<QueryOptimizationSessionEntry[]>;
}

export function createQueryOptimizationSessionRepository(): QueryOptimizationSessionRepository {
  return {
    async initializeSession(sessionId, entry, ttlSeconds) {
      const client = await createRedisClient();
      const payload: QueryOptimizationSessionStore = { history: [entry] };
      await client.set(
        buildSessionKey(sessionId),
        JSON.stringify(payload),
        "EX",
        ttlSeconds,
      );
    },

    async appendEntry(sessionId, entry, ttlSeconds) {
      const client = await createRedisClient();
      const key = buildSessionKey(sessionId);
      const raw = await client.get(key);
      let store: QueryOptimizationSessionStore = { history: [] };
      if (raw) {
        try {
          store = JSON.parse(raw) as QueryOptimizationSessionStore;
          if (!Array.isArray(store.history)) {
            store.history = [];
          }
        } catch (error) {
          console.warn("Failed to parse session history", error);
          store = { history: [] };
        }
      }
      store.history.push(entry);
      await client.set(key, JSON.stringify(store), "EX", ttlSeconds);
    },

    async getSessionHistory(sessionId) {
      const client = await createRedisClient();
      const raw = await client.get(buildSessionKey(sessionId));
      if (!raw) return [];
      try {
        const store = JSON.parse(raw) as QueryOptimizationSessionStore;
        if (!Array.isArray(store.history)) return [];
        return store.history;
      } catch (error) {
        console.warn("Failed to parse session history", error);
        return [];
      }
    },
  };
}

export async function __dangerouslyResetQueryOptimizationRedisClient() {
  if (redisClient?.disconnect) {
    redisClient.disconnect();
  }
  redisClient = undefined;
  inMemoryStore = undefined;
}
