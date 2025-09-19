import type {
  AppendEventInput,
  ResearchEvent,
  ResearchPersistencePort,
  ResearchSnapshot,
  SaveInitialSnapshotInput,
  UpdateSnapshotInput,
} from "@/shared/useCases/ports/research/persistence";

const SNAPSHOT_KEY_PREFIX = "research:snapshot:";
const EVENTS_KEY_PREFIX = "research:events:";

interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: "EX",
    ttlSeconds?: number,
  ): Promise<unknown>;
  del?(key: string): Promise<unknown>;
  lrange?(key: string, start: number, stop: number): Promise<string[]>;
  rpush?(key: string, ...values: string[]): Promise<unknown>;
  disconnect?: () => void;
}

interface InMemoryStore {
  snapshots: Map<string, ResearchSnapshot>;
  events: Map<string, ResearchEvent[]>;
}

let redisClient: RedisLikeClient | undefined;
let inMemoryStore: InMemoryStore | undefined;

function buildSnapshotKey(id: string): string {
  return `${SNAPSHOT_KEY_PREFIX}${id}`;
}

function buildEventsKey(id: string): string {
  return `${EVENTS_KEY_PREFIX}${id}`;
}

function ensureInMemoryStore(): InMemoryStore {
  if (!inMemoryStore) {
    inMemoryStore = {
      snapshots: new Map(),
      events: new Map(),
    };
  }
  return inMemoryStore;
}

function createInMemoryClient(): RedisLikeClient {
  return {
    async get(key: string) {
      const store = ensureInMemoryStore();
      if (key.startsWith(SNAPSHOT_KEY_PREFIX)) {
        const id = key.replace(SNAPSHOT_KEY_PREFIX, "");
        const snapshot = store.snapshots.get(id);
        return snapshot ? JSON.stringify(snapshot) : null;
      }
      if (key.startsWith(EVENTS_KEY_PREFIX)) {
        const id = key.replace(EVENTS_KEY_PREFIX, "");
        const events = store.events.get(id) ?? [];
        return JSON.stringify(events);
      }
      return null;
    },
    async set(key: string, value: string) {
      const store = ensureInMemoryStore();
      if (key.startsWith(SNAPSHOT_KEY_PREFIX)) {
        const id = key.replace(SNAPSHOT_KEY_PREFIX, "");
        const snapshot = JSON.parse(value) as ResearchSnapshot;
        store.snapshots.set(id, snapshot);
        return;
      }
      if (key.startsWith(EVENTS_KEY_PREFIX)) {
        const id = key.replace(EVENTS_KEY_PREFIX, "");
        const events = JSON.parse(value) as ResearchEvent[];
        store.events.set(id, events);
        return;
      }
    },
    async lrange(key: string) {
      const store = ensureInMemoryStore();
      if (!key.startsWith(EVENTS_KEY_PREFIX)) return [];
      const id = key.replace(EVENTS_KEY_PREFIX, "");
      const events = store.events.get(id) ?? [];
      return events.map((event) => JSON.stringify(event));
    },
    async rpush(key: string, ...values: string[]) {
      const store = ensureInMemoryStore();
      if (!key.startsWith(EVENTS_KEY_PREFIX)) return;
      const id = key.replace(EVENTS_KEY_PREFIX, "");
      const events = store.events.get(id) ?? [];
      for (const value of values) {
        events.push(JSON.parse(value) as ResearchEvent);
      }
      store.events.set(id, events);
    },
    disconnect() {
      inMemoryStore?.snapshots.clear();
      inMemoryStore?.events.clear();
      inMemoryStore = undefined;
    },
  };
}

async function fallbackToMemory(error?: unknown): Promise<RedisLikeClient> {
  if (error) {
    console.warn(
      "Redis接続に失敗したため、リサーチスナップショットをメモリに保存します。",
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

async function readSnapshot(
  client: RedisLikeClient,
  id: string,
): Promise<ResearchSnapshot | null> {
  const raw = await client.get(buildSnapshotKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResearchSnapshot;
  } catch (error) {
    console.warn("Failed to parse research snapshot", error);
    return null;
  }
}

async function writeSnapshot(
  client: RedisLikeClient,
  snapshot: ResearchSnapshot,
): Promise<void> {
  await client.set(buildSnapshotKey(snapshot.id), JSON.stringify(snapshot));
}

async function readEvents(
  client: RedisLikeClient,
  id: string,
): Promise<ResearchEvent[]> {
  if (typeof client.lrange === "function") {
    const rawList = await client.lrange(buildEventsKey(id), 0, -1);
    return rawList
      .map((raw) => {
        try {
          return JSON.parse(raw) as ResearchEvent;
        } catch (error) {
          console.warn("Failed to parse research event", error);
          return null;
        }
      })
      .filter((event): event is ResearchEvent => Boolean(event));
  }
  const raw = await client.get(buildEventsKey(id));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ResearchEvent[];
  } catch (error) {
    console.warn("Failed to parse research events", error);
    return [];
  }
}

async function appendEvents(
  client: RedisLikeClient,
  id: string,
  events: ResearchEvent[],
): Promise<void> {
  if (typeof client.rpush === "function") {
    if (events.length === 0) return;
    await client.rpush(
      buildEventsKey(id),
      ...events.map((event) => JSON.stringify(event)),
    );
    return;
  }

  const current = await readEvents(client, id);
  const next = [...current, ...events];
  await client.set(buildEventsKey(id), JSON.stringify(next));
}

function buildRepository(client: RedisLikeClient): ResearchPersistencePort {
  return {
    async saveInitialSnapshot(input: SaveInitialSnapshotInput) {
      const snapshot: ResearchSnapshot = {
        ...input,
        revision: 1,
        lastError: input.lastError ?? null,
      };
      await writeSnapshot(client, snapshot);
      await appendEvents(client, input.id, [
        {
          id: `${input.id}:rev:1`,
          revision: 1,
          type: "status",
          payload: { status: snapshot.status },
          createdAt: snapshot.updatedAt,
        },
      ]);
      return snapshot;
    },

    async updateSnapshot(input: UpdateSnapshotInput) {
      const current = await readSnapshot(client, input.id);
      if (!current) {
        throw new Error(
          `Research snapshot not found for id=${input.id}; saveInitialSnapshot must be called first`,
        );
      }

      const revision = current.revision + 1;
      const nextLastError =
        input.lastError === undefined
          ? (current.lastError ?? null)
          : input.lastError;
      const updated: ResearchSnapshot = {
        ...current,
        status: input.status ?? current.status,
        results: input.results ?? current.results,
        searchResults: input.searchResults ?? current.searchResults,
        citations: input.citations ?? current.citations,
        updatedAt: input.updatedAt,
        lastError: nextLastError,
        revision,
      };
      await writeSnapshot(client, updated);
      await appendEvents(client, input.id, [
        {
          id: `${input.id}:rev:${revision}`,
          revision,
          type:
            input.status && input.status !== current.status
              ? "status"
              : "snapshot",
          payload:
            input.status && input.status !== current.status
              ? { status: input.status }
              : { revision },
          createdAt: input.updatedAt,
        },
      ]);
      return updated;
    },

    async appendEvent(event: AppendEventInput) {
      const record: ResearchEvent = {
        id: `${event.id}:rev:${event.revision}`,
        revision: event.revision,
        type: event.type,
        payload: event.payload,
        createdAt: event.createdAt,
      };
      await appendEvents(client, event.id, [record]);
    },

    async getSnapshot(id) {
      return readSnapshot(client, id);
    },

    async getEventsSince(id, revision) {
      const events = await readEvents(client, id);
      return events.filter((event) => event.revision > revision);
    },
  };
}

export function createResearchRepository(): ResearchPersistencePort {
  let repositoryInstance: Promise<ResearchPersistencePort> | undefined;

  function getRepository(): Promise<ResearchPersistencePort> {
    if (!repositoryInstance) {
      repositoryInstance = (async () => {
        const client = await ensureRedisClient();
        return buildRepository(client);
      })();
    }
    return repositoryInstance;
  }

  return {
    async saveInitialSnapshot(input) {
      const repo = await getRepository();
      return repo.saveInitialSnapshot(input);
    },
    async updateSnapshot(input) {
      const repo = await getRepository();
      return repo.updateSnapshot(input);
    },
    async appendEvent(event) {
      const repo = await getRepository();
      return repo.appendEvent(event);
    },
    async getSnapshot(id) {
      const repo = await getRepository();
      return repo.getSnapshot(id);
    },
    async getEventsSince(id, revision) {
      const repo = await getRepository();
      return repo.getEventsSince(id, revision);
    },
  };
}

export async function __dangerouslyResetResearchRedisClient() {
  if (redisClient?.disconnect) {
    redisClient.disconnect();
  }
  redisClient = undefined;
  inMemoryStore = undefined;
}
