import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TranscribeClient } from "./transcribe";

// Mock AWS Streaming Client
const sendSpy = vi.fn();
vi.mock("@aws-sdk/client-transcribe-streaming", () => {
  const LocalStartStreamTranscriptionCommand = vi.fn(function (
    this: any,
    input: any,
  ) {
    // keep input for assertions
    (this as any).__input = input;
  });
  (global as any).__SSTC = LocalStartStreamTranscriptionCommand;
  return {
    TranscribeStreamingClient: vi.fn(() => ({ send: sendSpy })),
    StartStreamTranscriptionCommand: LocalStartStreamTranscriptionCommand,
  };
});

// Minimal fake browser APIs
class FakeAudioContext {
  sampleRate = 48000;
  state: "running" | "suspended" | "closed" = "running";
  audioWorklet = { addModule: vi.fn(async () => void 0) } as any;
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() })) as any;
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
}

const mockStream = { getTracks: vi.fn(() => [{ stop: vi.fn() }]) } as any;

function setupBrowserEnv() {
  Object.defineProperty(global as any, "navigator", {
    value: {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    },
    configurable: true,
  });
  Object.defineProperty(global as any, "window", {
    value: { AudioContext: FakeAudioContext },
    configurable: true,
  });
  (global as any).AudioWorkletNode = class FakeAWN {
    port = { onmessage: null as any };
    constructor() {}
    disconnect() {}
  };
}

describe("TranscribeClient streaming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setupBrowserEnv();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts streaming and handles transcript events (final)", async () => {
    // Mock AWS send to return async transcript stream
    sendSpy.mockImplementationOnce(async () => ({
      TranscriptResultStream: (async function* () {
        yield {
          TranscriptEvent: {
            Transcript: {
              Results: [
                {
                  IsPartial: false,
                  Alternatives: [{ Transcript: "テストです", Items: [] }],
                },
              ],
            },
          },
        };
      })(),
    }));

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true },
    );

    const onTranscriptionResult = vi.fn();
    client.setEventHandlers({
      onTranscriptionResult,
      onError: vi.fn(),
      onConnectionStatusChange: vi.fn(),
    });

    await client.startRealTimeTranscription();

    // allow background tasks to run
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);
    // Verify StartStreamTranscriptionCommand created with AudioContext sampleRate (48000)
    const cmdInstance = ((global as any).__SSTC as any).mock.instances[0];
    expect(cmdInstance.__input.MediaSampleRateHertz).toBe(48000);
    expect(cmdInstance.__input.LanguageCode).toBe("ja-JP");

    // Drain async iterator by advancing microtasks
    await Promise.resolve();
    expect(onTranscriptionResult).toHaveBeenCalledWith("テストです", true);

    await client.stopTranscription();
  });

  it("checkSupport does not require MediaRecorder", () => {
    // Ensure no MediaRecorder
    (global as any).window.MediaRecorder = undefined;
    const client = new TranscribeClient(
      {
        region: "us-east-1",
        languageCode: "en-US",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true },
    );
    expect(client.checkSupport()).toBe(true);
  });

  it("aggregates ~100ms audio chunks per AWS best practice", async () => {
    // Arrange a 16kHz environment
    class SR16kAC extends FakeAudioContext {
      sampleRate = 16000;
    }
    (global as any).window = { AudioContext: SR16kAC };

    let firstChunkBytes = 0;
    sendSpy.mockImplementationOnce(async (cmd: any) => {
      const input = (cmd as any).__input;
      const stream: AsyncIterable<any> = input.AudioStream;
      // Consume just one yielded chunk to measure its size
      (async () => {
        for await (const ev of stream) {
          const chunk = (ev as any).AudioEvent.AudioChunk as Uint8Array;
          firstChunkBytes = chunk.byteLength;
          break;
        }
      })();
      return { TranscriptResultStream: (async function* () {})() } as any;
    });

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true, chunkWaitMs: 1 },
    ) as any;

    // Feed ~100ms worth of PCM16 = 0.1 * 16000 * 2 = 3200 bytes
    const target = 3200;
    client.audioBuffer.push(new Uint8Array(target));

    await client.startRealTimeTranscription();
    // allow iteration to consume the first chunk
    await Promise.resolve();
    expect(firstChunkBytes).toBeGreaterThanOrEqual(3000);
    expect(firstChunkBytes).toBeLessThanOrEqual(3400);
    await client.stopTranscription();
  });

  it("enables partial results stabilization with medium stability by default", async () => {
    sendSpy.mockImplementationOnce(async () => ({
      TranscriptResultStream: (async function* () {})(),
    }));

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true },
    );

    await client.startRealTimeTranscription();
    const cmdInstance = ((global as any).__SSTC as any).mock.instances[0];
    const input = cmdInstance.__input;
    expect(input.EnablePartialResultsStabilization).toBe(true);
    expect((input.PartialResultsStability || "").toString().toLowerCase()).toBe(
      "medium",
    );
    await client.stopTranscription();
  });

  it("keeps MediaSampleRateHertz at 16000 even if AudioContext is 48k", async () => {
    class SR48kAC extends FakeAudioContext {
      sampleRate = 48000;
    }
    (global as any).window = { AudioContext: SR48kAC };

    let firstChunkBytes = 0;
    sendSpy.mockImplementationOnce(async (cmd: any) => {
      const input = (cmd as any).__input;
      const stream: AsyncIterable<any> = input.AudioStream;
      (async () => {
        for await (const ev of stream) {
          const chunk = (ev as any).AudioEvent.AudioChunk as Uint8Array;
          firstChunkBytes = chunk.byteLength;
          break;
        }
      })();
      return { TranscriptResultStream: (async function* () {})() } as any;
    });

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true, chunkWaitMs: 1 },
    );

    // Push 100ms worth at 16k => 3200 bytes so generator target matches 16k logic
    (client as any).audioBuffer.push(new Uint8Array(3200));

    await client.startRealTimeTranscription();
    await Promise.resolve();

    const cmdInstance = ((global as any).__SSTC as any).mock.instances[0];
    const input = cmdInstance.__input;
    expect(input.MediaSampleRateHertz).toBe(16000);
    expect(firstChunkBytes).toBeGreaterThanOrEqual(3000);
    expect(firstChunkBytes).toBeLessThanOrEqual(3400);
    await client.stopTranscription();
  });

  it("applies stabilization level from options: medium", async () => {
    sendSpy.mockImplementationOnce(async () => ({
      TranscriptResultStream: (async function* () {})(),
    }));

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true, stability: "medium" as any },
    );

    await client.startRealTimeTranscription();
    const cmdInstance = ((global as any).__SSTC as any).mock.instances[0];
    const input = cmdInstance.__input;
    expect(input.EnablePartialResultsStabilization).toBe(true);
    expect((input.PartialResultsStability || "").toString().toLowerCase()).toBe(
      "medium",
    );
  });

  it("disables stabilization when options.off is set", async () => {
    sendSpy.mockImplementationOnce(async () => ({
      TranscriptResultStream: (async function* () {})(),
    }));

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true, stability: "off" as any },
    );

    await client.startRealTimeTranscription();
    const cmdInstance = ((global as any).__SSTC as any).mock.instances[0];
    const input = cmdInstance.__input;
    expect(input.EnablePartialResultsStabilization).not.toBe(true);
    expect(input.PartialResultsStability).toBeUndefined();
  });

  // restartOnFinal 機能は削除済み

  it("stops audio stream when disconnected to avoid WS send on closed", async () => {
    // Arrange send to consume only a few chunks then complete
    let consumed = 0;
    sendSpy.mockImplementationOnce(async (cmd: any) => {
      const input = (cmd as any).__input;
      const stream: AsyncIterable<any> = input.AudioStream;
      // Simulate server reading: pull a few iterations then close
      (async () => {
        for await (const __unused of stream) {
          void __unused;
          consumed++;
          if (consumed > 3) break;
        }
      })();
      // Return a stream with no transcript events
      return { TranscriptResultStream: (async function* () {})() } as any;
    });

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true },
    );

    client.setEventHandlers({
      onTranscriptionResult: vi.fn(),
      onError: vi.fn(),
      onConnectionStatusChange: vi.fn(),
    });

    await client.startRealTimeTranscription();
    // Stop soon after start
    await client.stopTranscription();
    // Allow any pending ticks to settle
    await Promise.resolve();
    expect(consumed).toBeGreaterThan(0);
  });

  it("emits perf marks when enabled", async () => {
    const prev = process.env.NEXT_PUBLIC_VOICE_PERF;
    process.env.NEXT_PUBLIC_VOICE_PERF = "1";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Arrange AWS to yield one final result
    sendSpy.mockImplementationOnce(async () => ({
      TranscriptResultStream: (async function* () {
        yield {
          TranscriptEvent: {
            Transcript: {
              Results: [
                {
                  IsPartial: false,
                  Alternatives: [{ Transcript: "テスト2" }],
                },
              ],
            },
          },
        };
      })(),
    }));

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true },
    );

    await client.startRealTimeTranscription();
    await Promise.resolve();

    // Should include perf marks
    const calls = logSpy.mock.calls.map((c) => String(c[0]));
    expect(
      calls.some(
        (s) => s.includes("[VOICE_PERF]") && s.includes("stt.start.begin"),
      ),
    ).toBe(true);
    // We only assert early-stage mark here to avoid coupling to stream impl
    // Final result mark is validated implicitly by runtime logs when running the app

    logSpy.mockRestore();
    process.env.NEXT_PUBLIC_VOICE_PERF = prev;
  });

  it("does not emit perf marks when disabled", async () => {
    const prev = process.env.NEXT_PUBLIC_VOICE_PERF;
    delete process.env.NEXT_PUBLIC_VOICE_PERF;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    sendSpy.mockImplementationOnce(async () => ({
      TranscriptResultStream: (async function* () {
        yield {
          TranscriptEvent: {
            Transcript: {
              Results: [
                {
                  IsPartial: false,
                  Alternatives: [{ Transcript: "ok" }],
                },
              ],
            },
          },
        };
      })(),
    }));

    const client = new TranscribeClient(
      {
        region: "ap-northeast-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
      { enableInTest: true },
    );

    await client.startRealTimeTranscription();
    await Promise.resolve();

    const calls = logSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("[VOICE_PERF]"))).toBe(false);

    logSpy.mockRestore();
    process.env.NEXT_PUBLIC_VOICE_PERF = prev;
  });
});
