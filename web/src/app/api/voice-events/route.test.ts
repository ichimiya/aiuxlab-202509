import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const enqueueMock = vi.fn();

vi.mock("@/shared/infrastructure/voice/eventQueue", () => ({
  getVoiceEventQueue: () => ({
    enqueue: enqueueMock,
  }),
}));

import { POST } from "./route";

describe("POST /api/voice-events", () => {
  beforeEach(() => {
    enqueueMock.mockReset();
  });

  it("リクエストボディが不正な場合は400を返す", async () => {
    const request = new NextRequest("http://localhost:3000/api/voice-events", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("INVALID_JSON");
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("音声イベントをキューに登録して202で応答する", async () => {
    const body = {
      sessionId: "session-voice",
      transcript: "サッカーの代表チームを調べたい",
      confidence: 0.85,
      isFinal: true,
      locale: "ja-JP",
      device: "web",
      chunkSeq: 4,
      timestamp: "2025-09-18T10:00:00.000Z",
    };

    const request = new NextRequest("http://localhost:3000/api/voice-events", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(202);
    const payload = await response.json();
    expect(payload.accepted).toBe(true);
    expect(enqueueMock).toHaveBeenCalledTimes(1);

    const enqueuedJob = enqueueMock.mock.calls[0][0];
    expect(enqueuedJob.sessionId).toBe(body.sessionId);
    expect(enqueuedJob.transcript).toBe(body.transcript);
    expect(enqueuedJob.metadata.chunkSeq).toBe(4);
    expect(enqueuedJob.metadata.locale).toBe("ja-JP");
    expect(enqueuedJob.metadata.device).toBe("web");
    expect(enqueuedJob.timestamp).toBe(body.timestamp);
  });
});
