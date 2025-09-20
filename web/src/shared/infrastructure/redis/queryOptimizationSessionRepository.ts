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

function createInMemoryClient(): RedisLikeClient {
  if (!inMemoryStore) {
    inMemoryStore = new Map();
  }

  return {
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
}

function shouldFallbackOnError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("econnrefused") ||
    message.includes("max retries per request") ||
    message.includes("socket closed")
  );
}

async function fallbackToMemory(error?: unknown): Promise<RedisLikeClient> {
  if (error) {
    console.warn(
      "Redis接続に失敗したため、クエリ最適化セッションをメモリに保存します。",
      error,
    );
  }
  if (redisClient?.disconnect) {
    try {
      redisClient.disconnect();
    } catch (disconnectError) {
      console.warn("Redis切断時にエラーが発生しました", disconnectError);
    }
  }
  redisClient = createInMemoryClient();
  return redisClient;
}

async function ensureRedisClient(): Promise<RedisLikeClient> {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return fallbackToMemory();
  }

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    }) as RedisLikeClient & { connect?: () => Promise<void> };

    if (typeof client.connect === "function") {
      try {
        await client.connect();
      } catch (connectionError) {
        return fallbackToMemory(connectionError);
      }
    }

    redisClient = client;
    return redisClient;
  } catch (error) {
    return fallbackToMemory(error);
  }
}

async function runWithSessionClient<T>(
  action: (client: RedisLikeClient) => Promise<T>,
): Promise<T> {
  const client = await ensureRedisClient();
  try {
    return await action(client);
  } catch (error) {
    if (!shouldFallbackOnError(error)) {
      throw error;
    }
    const fallbackClient = await fallbackToMemory(error);
    return action(fallbackClient);
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
      const payload: QueryOptimizationSessionStore = { history: [entry] };
      await runWithSessionClient((client) =>
        client.set(
          buildSessionKey(sessionId),
          JSON.stringify(payload),
          "EX",
          ttlSeconds,
        ),
      );
    },

    async appendEntry(sessionId, entry, ttlSeconds) {
      const key = buildSessionKey(sessionId);
      const raw = await runWithSessionClient((client) => client.get(key));
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
      await runWithSessionClient((client) =>
        client.set(key, JSON.stringify(store), "EX", ttlSeconds),
      );
    },

    async getSessionHistory(sessionId) {
      const raw = await runWithSessionClient((client) =>
        client.get(buildSessionKey(sessionId)),
      );
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
