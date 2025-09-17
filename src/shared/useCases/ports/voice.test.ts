import { describe, it, expect, vi } from "vitest";
import type {
  VoiceEventJob,
  VoiceIntentResult,
  VoiceSessionState,
} from "./voice";
import {
  InMemoryVoiceEventQueue,
  InMemoryVoiceSessionStore,
  InMemoryVoiceNotificationAdapter,
  DelegateVoiceIntentClassifier,
} from "@/shared/infrastructure/voice/inMemoryAdapters";

describe("Voiceポートのインメモリアダプタ", () => {
  it("VoiceEventQueueがFIFOでジョブを処理する", async () => {
    const handled: string[] = [];
    const queue = new InMemoryVoiceEventQueue(async (job) => {
      handled.push(job.sessionId);
    });

    const jobs: VoiceEventJob[] = [
      {
        sessionId: "s1",
        timestamp: new Date().toISOString(),
        transcript: "AIのリスク",
        confidence: 0.9,
        isFinal: false,
        metadata: { locale: "ja-JP", device: "web", chunkSeq: 1 },
      },
      {
        sessionId: "s1",
        timestamp: new Date().toISOString(),
        transcript: "重大事例も",
        confidence: 0.88,
        isFinal: true,
        metadata: { locale: "ja-JP", device: "web", chunkSeq: 2 },
      },
    ];

    await Promise.all(jobs.map((job) => queue.enqueue(job)));

    expect(handled).toEqual(["s1", "s1"]);
  });

  it("VoiceSessionStoreで状態を保存・取得できる", async () => {
    const store = new InMemoryVoiceSessionStore();
    const state: VoiceSessionState = {
      sessionId: "session-10",
      status: "ready",
      candidates: [],
      selectedCandidateId: "candidate-1",
      lastUpdatedAt: new Date().toISOString(),
    };

    await store.set(state);
    expect(await store.get("session-10")).toEqual(state);

    await store.delete("session-10");
    expect(await store.get("session-10")).toBeNull();
  });

  it("VoiceIntentClassifierが委譲コールバックを呼び出す", async () => {
    const classify = vi.fn(
      async () =>
        ({
          intentId: "OPTIMIZE_QUERY_APPEND",
          confidence: 0.72,
          parameters: { partialText: "重大事例" },
        }) satisfies VoiceIntentResult,
    );

    const classifier = new DelegateVoiceIntentClassifier(classify);
    const result = await classifier.classify({
      sessionId: "session-11",
      text: "重大事例も入れて",
      context: {},
    });

    expect(classify).toHaveBeenCalledOnce();
    expect(result.intentId).toBe("OPTIMIZE_QUERY_APPEND");
  });

  it("VoiceNotificationAdapterが購読者へイベントを配信する", async () => {
    const adapter = new InMemoryVoiceNotificationAdapter();
    const listener = vi.fn();

    adapter.subscribe(listener);

    await adapter.publish({
      type: "session_update",
      sessionId: "session-12",
      payload: { status: "ready" },
    });

    expect(listener).toHaveBeenCalledWith({
      type: "session_update",
      sessionId: "session-12",
      payload: { status: "ready" },
    });
  });
});
