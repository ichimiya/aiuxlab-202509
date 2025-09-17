/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { VoiceSessionState } from "@/shared/stores/voiceRecognitionStore";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";
import { useVoiceSSE } from "./useVoiceSSE";

type EventHandler = (event: MessageEvent<string>) => void;

class MockEventSource {
  url: string;
  readyState = 0;
  onerror: ((this: EventSource, ev: Event) => any) | null = null;

  private listeners: Record<string, EventHandler[]> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
  ): void {
    if (!callback) return;
    const handler: EventHandler =
      typeof callback === "function"
        ? (event) => callback.call(this as unknown as EventSource, event)
        : (event) => callback.handleEvent?.(event);
    this.listeners[type] = this.listeners[type] ?? [];
    this.listeners[type]!.push(handler);
  }

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
  ): void {
    if (!callback) return;
    const handler: EventHandler =
      typeof callback === "function"
        ? (event) => callback.call(this as unknown as EventSource, event)
        : (event) => callback.handleEvent?.(event);
    this.listeners[type] = (this.listeners[type] ?? []).filter(
      (fn) => fn !== handler,
    );
  }

  close(): void {
    this.readyState = 2; // CLOSED
  }

  emit(type: string, data: unknown) {
    const handlers = this.listeners[type] ?? [];
    handlers.forEach((handler) =>
      handler(new MessageEvent(type, { data: JSON.stringify(data) })),
    );
    if (type === "error") {
      this.onerror?.call(this as unknown as EventSource, new Event("error"));
    }
  }

  static instances: MockEventSource[] = [];
}

describe("useVoiceSSE", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    useVoiceRecognitionStore.getState().reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("セッションアップデートイベントを反映する", () => {
    const result = renderHook(() =>
      useVoiceSSE({ sessionId: "session-1", isPrimaryTab: true }),
    );

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toContain(
      "/api/voice-events/stream?sessionId=session-1",
    );

    const update: VoiceSessionState = {
      sessionId: "session-1",
      status: "optimizing",
      candidates: [],
      lastUpdatedAt: "2025-09-17T02:10:00.000Z",
    };

    act(() => {
      MockEventSource.instances[0]?.emit("session_update", update);
    });

    const storeState = useVoiceRecognitionStore.getState();
    expect(storeState.sessionState?.status).toBe("optimizing");
    expect(storeState.sessionState?.lastUpdatedAt).toBe(update.lastUpdatedAt);

    result.unmount();
  });

  it("エラーイベントで再接続カウンタが増加し、再接続がスケジュールされる", () => {
    renderHook(() =>
      useVoiceSSE({ sessionId: "session-2", isPrimaryTab: true }),
    );

    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      MockEventSource.instances[0]?.emit("error", { message: "network" });
    });

    expect(useVoiceRecognitionStore.getState().lastError).toBeTruthy();
    expect(
      useVoiceRecognitionStore.getState().reconnectAttempt,
    ).toBeGreaterThanOrEqual(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(MockEventSource.instances).toHaveLength(2);
  });
});
