import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const subscribeMock = vi.fn();
let listener: ((event: any) => void) | undefined;

vi.mock("@/shared/infrastructure/voice/notificationGateway", () => ({
  getVoiceNotificationAdapter: () => ({
    subscribe: subscribeMock.mockImplementation((cb: (event: any) => void) => {
      listener = cb;
      return () => {
        listener = undefined;
      };
    }),
  }),
}));

import { GET } from "./stream/route";

const decoder = new TextDecoder();

async function readChunk(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const { value } = await reader.read();
  reader.releaseLock();
  if (!value) return "";
  return decoder.decode(value);
}

describe("GET /api/voice-events/stream", () => {
  beforeEach(() => {
    subscribeMock.mockClear();
    listener = undefined;
  });

  it("sessionIdがない場合400エラーを返す", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/voice-events/stream",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("MISSING_SESSION_ID");
  });

  it("SSEストリームを返し、通知を配信する", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/voice-events/stream?sessionId=session-123",
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    const initial = await readChunk(response);
    expect(initial).toMatch(/event: connected/);
    expect(initial).toMatch(/session-123/);

    listener?.({
      type: "session_update",
      sessionId: "session-123",
      payload: { status: "ready" },
    });

    const updateChunk = await readChunk(response);
    expect(updateChunk).toMatch(/event: session_update/);
    expect(updateChunk).toMatch(/"status":"ready"/);
  });
});
