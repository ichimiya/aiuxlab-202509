import { describe, it, expect, vi, beforeEach } from "vitest";
import { TranscribeClient } from "./index";

// AWS SDK Mock
vi.mock("@aws-sdk/client-transcribe", () => ({
  TranscribeClient: vi.fn(),
  StartStreamTranscriptionCommand: vi.fn(),
  StopStreamTranscriptionCommand: vi.fn(),
}));

// Browser API Mocks
const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onstop: null,
  stream: mockMediaStream,
};

// Global mocks setup
Object.defineProperty(global, "navigator", {
  value: {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
    },
  },
  writable: true,
});

Object.defineProperty(global, "MediaRecorder", {
  value: vi.fn(() => mockMediaRecorder),
  writable: true,
});

Object.defineProperty(global, "window", {
  value: {
    MediaRecorder: vi.fn(() => mockMediaRecorder),
  },
  writable: true,
});

describe("TranscribeClient", () => {
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

  describe("initialization", () => {
    it("should create TranscribeClient with correct config", () => {
      expect(transcribeClient).toBeInstanceOf(TranscribeClient);
    });

    it("should check if transcription is supported", () => {
      const isSupported = transcribeClient.checkSupport();
      expect(typeof isSupported).toBe("boolean");
    });
  });

  describe("audio transcription", () => {
    it("should transcribe audio blob and return response", async () => {
      const mockAudioBlob = new Blob(["mock audio data"], {
        type: "audio/wav",
      });

      const response = await transcribeClient.transcribeAudio(mockAudioBlob);

      expect(response).toEqual({
        transcript: expect.any(String),
        confidence: expect.any(Number),
        isPartial: expect.any(Boolean),
        alternatives: expect.any(Array),
      });
    });

    it("should handle transcription errors gracefully", async () => {
      const invalidBlob = new Blob([""], { type: "text/plain" });

      await expect(
        transcribeClient.transcribeAudio(invalidBlob),
      ).rejects.toThrow("Invalid audio format");
    });
  });

  describe("real-time transcription", () => {
    it("should start real-time transcription successfully", async () => {
      await expect(
        transcribeClient.startRealTimeTranscription(),
      ).resolves.toBeUndefined();
    });

    it("should stop transcription successfully", async () => {
      await transcribeClient.startRealTimeTranscription();
      await expect(
        transcribeClient.stopTranscription(),
      ).resolves.toBeUndefined();
    });

    it("should throw error when stopping without starting", async () => {
      await expect(transcribeClient.stopTranscription()).rejects.toThrow(
        "No active transcription session",
      );
    });
  });

  describe("permissions", () => {
    it("should request microphone permission", async () => {
      const hasPermission = await transcribeClient.requestPermission();
      expect(typeof hasPermission).toBe("boolean");
      expect(hasPermission).toBe(true);
    });

    it("should handle permission denial", async () => {
      // Mock permission denial
      vi.mocked(
        global.navigator.mediaDevices.getUserMedia,
      ).mockRejectedValueOnce(new Error("Permission denied"));

      const hasPermission = await transcribeClient.requestPermission();
      expect(hasPermission).toBe(false);
    });
  });
});
