import { describe, it, expect, vi, beforeEach } from "vitest";
import { TranscribeClient } from "./transcribe";

// AWS SDK Mock
vi.mock("@aws-sdk/client-transcribe", () => ({
  TranscribeClient: vi.fn(),
  StartStreamTranscriptionCommand: vi.fn(),
  StopStreamTranscriptionCommand: vi.fn(),
}));

// Browser API Mocks
const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
} as unknown as MediaStream;
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onstop: null,
  stream: mockMediaStream,
} as unknown as MediaRecorder;

Object.defineProperty(global, "navigator", {
  value: {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockMediaStream) },
  },
  writable: true,
});
Object.defineProperty(global, "MediaRecorder", {
  value: vi.fn(() => mockMediaRecorder),
  writable: true,
});
Object.defineProperty(global, "window", {
  value: { MediaRecorder: vi.fn(() => mockMediaRecorder) },
  writable: true,
});

describe("TranscribeClient (internal)", () => {
  let transcribeClient: TranscribeClient;
  const mockConfig = {
    region: "us-east-1",
    languageCode: "ja-JP" as const,
    mediaEncoding: "pcm" as const,
    mediaSampleRateHertz: 16000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    transcribeClient = new TranscribeClient(mockConfig);
  });

  it("should check support", () => {
    expect(typeof transcribeClient.checkSupport()).toBe("boolean");
  });

  it("should transcribe audio blob and return response", async () => {
    const mockAudioBlob = new Blob(["mock audio data"], { type: "audio/wav" });
    const response = await transcribeClient.transcribeAudio(mockAudioBlob);
    expect(response).toEqual({
      transcript: expect.any(String),
      confidence: expect.any(Number),
      isPartial: expect.any(Boolean),
      alternatives: expect.any(Array),
    });
  });

  it("should handle invalid audio", async () => {
    const invalidBlob = new Blob([""], { type: "text/plain" });
    await expect(transcribeClient.transcribeAudio(invalidBlob)).rejects.toThrow(
      "Invalid audio format",
    );
  });
});
