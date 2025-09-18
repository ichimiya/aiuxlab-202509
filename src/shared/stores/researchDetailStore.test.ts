import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ResearchEvent,
  ResearchSnapshot,
} from "@/shared/useCases/ports/research";
import { createResearchDetailStore } from "./researchDetailStore";

const baseSnapshot: ResearchSnapshot = {
  id: "research-uuid",
  query: "Redis Streams",
  status: "pending",
  revision: 1,
  results: [],
  searchResults: [],
  citations: [],
  createdAt: "2025-09-18T10:00:00.000Z",
  updatedAt: "2025-09-18T10:00:00.000Z",
  lastError: null,
};

describe("researchDetailStore", () => {
  const fetchSnapshot =
    vi.fn<(researchId: string) => Promise<ResearchSnapshot | null>>();
  const unsubscribe = vi.fn();
  let eventListeners: Array<(event: ResearchEvent) => void>;
  let errorListeners: Array<(error: Error) => void>;
  const openEventStream = vi.fn(
    ({
      onEvent,
      onError,
      researchId,
      lastEventId,
    }: {
      researchId: string;
      lastEventId?: number;
      onEvent: (event: ResearchEvent) => void;
      onError: (error: Error) => void;
    }) => {
      void researchId;
      void lastEventId;
      eventListeners.push(onEvent);
      errorListeners.push(onError);
      return unsubscribe;
    },
  );

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSnapshot.mockResolvedValue(structuredClone(baseSnapshot));
    eventListeners = [];
    errorListeners = [];
  });

  it("connectでスナップショットを取得し、接続状態をopenにする", async () => {
    const store = createResearchDetailStore({ fetchSnapshot, openEventStream });
    await store.getState().connect("research-uuid");

    expect(fetchSnapshot).toHaveBeenCalledWith("research-uuid");
    const state = store.getState();
    expect(state.snapshots["research-uuid"]).toEqual({
      ...baseSnapshot,
      revision: 1,
    });
    expect(state.connections["research-uuid"]).toEqual({
      status: "open",
      lastEventId: 1,
    });
  });

  it("statusイベントでスナップショットの状態が更新される", async () => {
    const store = createResearchDetailStore({ fetchSnapshot, openEventStream });
    await store.getState().connect("research-uuid");

    const statusEvent: ResearchEvent = {
      id: "research-uuid",
      revision: 2,
      type: "status",
      payload: { status: "completed" },
      createdAt: "2025-09-18T10:01:00.000Z",
    };

    eventListeners[0]?.(statusEvent);

    const state = store.getState();
    expect(state.snapshots["research-uuid"].status).toBe("completed");
    expect(state.connections["research-uuid"].lastEventId).toBe(2);
  });

  it("result-appendedイベントで結果が追加される", async () => {
    const store = createResearchDetailStore({ fetchSnapshot, openEventStream });
    await store.getState().connect("research-uuid");

    const resultEvent: ResearchEvent = {
      id: "research-uuid",
      revision: 2,
      type: "result-appended",
      payload: {
        id: "result-1",
        content: "Redis Streams enable fan-out",
        source: "perplexity",
        relevanceScore: 1,
      },
      createdAt: "2025-09-18T10:01:30.000Z",
    };

    eventListeners[0]?.(resultEvent);

    const state = store.getState();
    expect(state.snapshots["research-uuid"].results).toHaveLength(1);
    expect(state.snapshots["research-uuid"].results?.[0]?.id).toBe("result-1");
    expect(state.connections["research-uuid"].lastEventId).toBe(2);
  });

  it("errorイベントでlastErrorが反映される", async () => {
    const store = createResearchDetailStore({ fetchSnapshot, openEventStream });
    await store.getState().connect("research-uuid");

    const errorEvent: ResearchEvent = {
      id: "research-uuid",
      revision: 2,
      type: "error",
      payload: { message: "Perplexity timeout" },
      createdAt: "2025-09-18T10:02:00.000Z",
    };

    eventListeners[0]?.(errorEvent);

    const state = store.getState();
    expect(state.snapshots["research-uuid"].lastError).toEqual({
      message: "Perplexity timeout",
    });
    expect(state.connections["research-uuid"].status).toBe("error");
  });

  it("イベント処理後に再接続するとlastEventIdを引き継ぐ", async () => {
    const store = createResearchDetailStore({ fetchSnapshot, openEventStream });
    await store.getState().connect("research-uuid");

    const statusEvent: ResearchEvent = {
      id: "research-uuid",
      revision: 3,
      type: "status",
      payload: { status: "failed" },
      createdAt: "2025-09-18T10:03:00.000Z",
    };
    eventListeners[0]?.(statusEvent);

    await store.getState().reconnect("research-uuid");

    expect(openEventStream).toHaveBeenLastCalledWith(
      expect.objectContaining({ lastEventId: 3 }),
    );
  });

  it("disconnectで購読を停止し、接続状態をidleにする", async () => {
    const store = createResearchDetailStore({ fetchSnapshot, openEventStream });
    await store.getState().connect("research-uuid");

    store.getState().disconnect("research-uuid");

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(store.getState().connections["research-uuid"].status).toBe("idle");
  });

  it("イベントストリームでエラーが発生した場合、接続状態をerrorにする", async () => {
    const store = createResearchDetailStore({ fetchSnapshot, openEventStream });
    await store.getState().connect("research-uuid");

    const error = new Error("SSE connection lost");
    errorListeners[0]?.(error);

    expect(store.getState().connections["research-uuid"]).toEqual({
      status: "error",
      lastEventId: 1,
      error: "SSE connection lost",
    });
  });
});
