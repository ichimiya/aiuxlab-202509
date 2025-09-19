import { create } from "zustand";
import type {
  ResearchEvent,
  ResearchSnapshot,
} from "@/shared/useCases/ports/research";

export type ResearchConnectionStatus = "idle" | "connecting" | "open" | "error";

export interface ResearchConnectionState {
  status: ResearchConnectionStatus;
  lastEventId?: number;
  error?: string;
}

export interface ResearchDetailState {
  snapshots: Record<string, ResearchSnapshot>;
  connections: Record<string, ResearchConnectionState>;
  connect: (researchId: string) => Promise<void>;
  reconnect: (researchId: string) => Promise<void>;
  disconnect: (researchId: string) => void;
  applyEvent: (researchId: string, event: ResearchEvent) => void;
}

interface ResearchDetailStoreDeps {
  fetchSnapshot: (researchId: string) => Promise<ResearchSnapshot | null>;
  openEventStream: (params: {
    researchId: string;
    lastEventId?: number;
    onEvent: (event: ResearchEvent) => void;
    onError: (error: Error) => void;
  }) => () => void;
}

const defaultDeps: ResearchDetailStoreDeps = {
  async fetchSnapshot(researchId: string) {
    if (typeof fetch === "undefined") return null;
    try {
      const response = await fetch(`/api/research/${researchId}`);
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as ResearchSnapshot;
    } catch (error) {
      console.warn("Failed to fetch research snapshot", error);
      return null;
    }
  },
  openEventStream({ researchId, lastEventId, onEvent, onError }) {
    if (
      typeof window === "undefined" ||
      typeof window.EventSource === "undefined"
    ) {
      return () => {};
    }

    let url = `/api/research/${researchId}/events`;
    if (lastEventId) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}lastEventId=${encodeURIComponent(String(lastEventId))}`;
    }

    const eventSource = new window.EventSource(url);
    const eventTypes: ResearchEvent["type"][] = [
      "status",
      "snapshot",
      "result-appended",
      "error",
    ];

    const listeners = eventTypes.map((eventType) => {
      const handler = (evt: MessageEvent<string>) => {
        const revision = evt.lastEventId ? Number(evt.lastEventId) : undefined;
        if (!revision) return;
        let payload: unknown = undefined;
        if (evt.data) {
          try {
            payload = JSON.parse(evt.data);
          } catch (error) {
            console.warn("Failed to parse SSE payload", error);
          }
        }
        onEvent({
          id: researchId,
          revision,
          type: eventType,
          payload,
          createdAt: new Date().toISOString(),
        });
      };
      eventSource.addEventListener(eventType, handler as EventListener);
      return { eventType, handler };
    });

    eventSource.onerror = () => {
      onError(new Error("SSE connection error"));
    };

    return () => {
      listeners.forEach(({ eventType, handler }) => {
        eventSource.removeEventListener(eventType, handler as EventListener);
      });
      eventSource.close();
    };
  },
};

function mergeResearchSnapshot(
  snapshot: ResearchSnapshot,
  event: ResearchEvent,
): ResearchSnapshot {
  const next: ResearchSnapshot = {
    ...snapshot,
    results: snapshot.results ? [...snapshot.results] : [],
    searchResults: snapshot.searchResults ? [...snapshot.searchResults] : [],
    citations: snapshot.citations ? [...snapshot.citations] : [],
    lastError: snapshot.lastError ? { ...snapshot.lastError } : null,
  };

  if (event.createdAt) {
    next.updatedAt = event.createdAt;
  }
  next.revision = event.revision;

  switch (event.type) {
    case "status": {
      const payload = event.payload as { status?: string };
      if (payload?.status) {
        next.status = payload.status as ResearchSnapshot["status"];
        if (payload.status !== "failed") {
          next.lastError = null;
        }
      }
      break;
    }
    case "result-appended": {
      const payload = event.payload as ResearchSnapshot["results"][number];
      if (payload) {
        next.results = [...(snapshot.results ?? []), payload];
      }
      break;
    }
    case "error": {
      const payload = event.payload as { message?: string; code?: string };
      next.lastError = {
        message: payload?.message ?? "Unknown error",
        code: payload?.code,
      };
      break;
    }
    case "snapshot": {
      if (event.payload && typeof event.payload === "object") {
        Object.assign(next, event.payload);
      }
      break;
    }
    default:
      break;
  }

  return next;
}

export function createResearchDetailStore(
  deps: Partial<ResearchDetailStoreDeps> = {},
) {
  const resolvedDeps: ResearchDetailStoreDeps = {
    fetchSnapshot: deps.fetchSnapshot ?? defaultDeps.fetchSnapshot,
    openEventStream: deps.openEventStream ?? defaultDeps.openEventStream,
  };

  const subscriptions = new Map<string, () => void>();

  return create<ResearchDetailState>((set, get) => ({
    snapshots: {},
    connections: {},

    async connect(researchId: string) {
      const state = get();
      const previousConnection = state.connections[researchId];
      const previousSnapshot = state.snapshots[researchId];
      const resumeRevision =
        previousConnection?.lastEventId ?? previousSnapshot?.revision ?? 0;

      set((current) => ({
        connections: {
          ...current.connections,
          [researchId]: {
            status: "connecting",
            lastEventId:
              previousConnection?.lastEventId ?? previousSnapshot?.revision,
          },
        },
      }));

      const snapshot = await resolvedDeps.fetchSnapshot(researchId);
      if (!snapshot) {
        set((current) => ({
          connections: {
            ...current.connections,
            [researchId]: {
              status: "error",
              error: "SNAPSHOT_NOT_FOUND",
              lastEventId: previousConnection?.lastEventId,
            },
          },
        }));
        return;
      }

      set((current) => ({
        snapshots: {
          ...current.snapshots,
          [researchId]: snapshot,
        },
      }));

      const lastEventId = Math.max(resumeRevision, snapshot.revision ?? 0);

      if (subscriptions.has(researchId)) {
        subscriptions.get(researchId)?.();
      }

      const unsubscribe = resolvedDeps.openEventStream({
        researchId,
        lastEventId,
        onEvent: (event) => {
          get().applyEvent(researchId, event);
        },
        onError: (error) => {
          set((current) => ({
            connections: {
              ...current.connections,
              [researchId]: {
                status: "error",
                lastEventId:
                  current.connections[researchId]?.lastEventId ?? lastEventId,
                error: error.message,
              },
            },
          }));
        },
      });

      subscriptions.set(researchId, unsubscribe);

      set((current) => ({
        connections: {
          ...current.connections,
          [researchId]: {
            status: "open",
            lastEventId,
          },
        },
      }));
    },

    async reconnect(researchId: string) {
      await get().connect(researchId);
    },

    disconnect(researchId: string) {
      const unsubscribe = subscriptions.get(researchId);
      if (unsubscribe) {
        unsubscribe();
        subscriptions.delete(researchId);
      }
      set((current) => ({
        connections: {
          ...current.connections,
          [researchId]: {
            status: "idle",
          },
        },
      }));
    },

    applyEvent(researchId: string, event: ResearchEvent) {
      set((current) => {
        const snapshot = current.snapshots[researchId];
        const connection = current.connections[researchId];
        const lastRevision = connection?.lastEventId ?? snapshot?.revision ?? 0;
        if (!snapshot || event.revision < lastRevision) {
          return current;
        }

        const updatedSnapshot = mergeResearchSnapshot(snapshot, event);
        const nextConnections = {
          ...current.connections,
          [researchId]: {
            status:
              event.type === "error" ? "error" : (connection?.status ?? "open"),
            lastEventId: event.revision,
            error:
              event.type === "error"
                ? ((event.payload as { message?: string })?.message ??
                  "Event error")
                : undefined,
          },
        };

        return {
          snapshots: {
            ...current.snapshots,
            [researchId]: updatedSnapshot,
          },
          connections: nextConnections,
        };
      });
    },
  }));
}

export const useResearchDetailStore = createResearchDetailStore();
