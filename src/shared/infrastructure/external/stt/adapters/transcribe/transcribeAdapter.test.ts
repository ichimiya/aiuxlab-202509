import { describe, it, expect, vi, beforeEach } from "vitest";

// Intercept TranscribeClient constructor args
const ctorSpy = vi.fn();
vi.mock("./internal", () => ({
  TranscribeClient: vi.fn((config: any, opts?: any) => {
    ctorSpy(config, opts);
    // return minimal stub that matches adapter calls
    return {
      isActive: false,
      checkSupport: () => true,
      requestPermission: vi.fn(async () => true),
      setEventHandlers: vi.fn(),
      startRealTimeTranscription: vi.fn(async () => void 0),
      stopTranscription: vi.fn(async () => void 0),
      transcribeAudio: vi.fn(async () => ({ transcript: "", confidence: 0.5, isPartial: false })),
    } as any;
  }),
}));

import { TranscribeAdapter } from "./transcribeAdapter";

describe("TranscribeAdapter config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (process.env as any).NEXT_PUBLIC_AWS_REGION;
    delete (process.env as any).NEXT_PUBLIC_AWS_TRANSCRIBE_LOW_LATENCY;
    delete (process.env as any).NEXT_PUBLIC_AWS_TRANSCRIBE_CHUNK_MS;
  });

  it("uses env region when provided", () => {
    (process.env as any).NEXT_PUBLIC_AWS_REGION = "ap-northeast-1";
    // instantiate
    // eslint-disable-next-line no-new
    new TranscribeAdapter();
    expect(ctorSpy).toHaveBeenCalled();
    const [cfg] = ctorSpy.mock.calls[0];
    expect(cfg.region).toBe("ap-northeast-1");
  });

  it("enables low-latency options when env set", () => {
    (process.env as any).NEXT_PUBLIC_AWS_TRANSCRIBE_LOW_LATENCY = "1";
    // eslint-disable-next-line no-new
    new TranscribeAdapter();
    const [, opts] = ctorSpy.mock.calls[0];
    expect(opts?.chunkWaitMs).toBe(5);
  });

  it("passes target chunk ms when env set", () => {
    (process.env as any).NEXT_PUBLIC_AWS_TRANSCRIBE_CHUNK_MS = "80";
    // eslint-disable-next-line no-new
    new TranscribeAdapter();
    const [, opts] = ctorSpy.mock.calls[0];
    expect(opts?.targetChunkMs).toBe(80);
  });

  it("maps stability env to client options (medium)", () => {
    (process.env as any).NEXT_PUBLIC_AWS_TRANSCRIBE_STABILITY = "medium";
    // eslint-disable-next-line no-new
    new TranscribeAdapter();
    const [, opts] = ctorSpy.mock.calls[0];
    expect((opts as any).stability).toBe("medium");
  });

  it("maps stability env to off", () => {
    (process.env as any).NEXT_PUBLIC_AWS_TRANSCRIBE_STABILITY = "off";
    // eslint-disable-next-line no-new
    new TranscribeAdapter();
    const [, opts] = ctorSpy.mock.calls[0];
    expect((opts as any).stability).toBe("off");
  });

  // restartOnFinal は削除済み
});
