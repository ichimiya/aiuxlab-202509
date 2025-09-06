import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { ProcessVoiceCommandUseCase } from "./index";
import { TranscribeClient } from "../../infrastructure/external/transcribe";
import { VoiceDomainService } from "../../domain/voice/services";

// Mocks
vi.mock("../../infrastructure/external/transcribe");
vi.mock("../../domain/voice/services");

describe("ProcessVoiceCommandUseCase", () => {
  let useCase: ProcessVoiceCommandUseCase;
  let mockTranscribeClient: Mocked<TranscribeClient>;
  let mockVoiceDomainService: Mocked<VoiceDomainService>;

  beforeEach(() => {
    mockTranscribeClient = {
      transcribeAudio: vi.fn(),
      checkSupport: vi.fn(),
      requestPermission: vi.fn(),
      startRealTimeTranscription: vi.fn(),
      stopTranscription: vi.fn(),
      setEventHandlers: vi.fn(),
      isActive: false,
    } as unknown as Mocked<TranscribeClient>;

    mockVoiceDomainService = {
      parseVoiceCommand: vi.fn(),
      calculateConfidence: vi.fn(),
      normalizeVoiceInput: vi.fn(),
      getAllPatterns: vi.fn(),
      getPatternKeywords: vi.fn(),
    } as unknown as Mocked<VoiceDomainService>;

    useCase = new ProcessVoiceCommandUseCase(
      mockTranscribeClient,
      mockVoiceDomainService,
    );
  });

  describe("execute", () => {
    it("should process audio input and return voice command result", async () => {
      // Arrange
      const mockAudioBlob = new Blob(["mock audio"], { type: "audio/wav" });

      mockTranscribeClient.transcribeAudio.mockResolvedValue({
        transcript: "詳しく調べて",
        confidence: 0.95,
        isPartial: false,
        alternatives: [
          { transcript: "詳しく調べて", confidence: 0.95 },
          { transcript: "くわしく調べて", confidence: 0.87 },
        ],
      });

      mockVoiceDomainService.parseVoiceCommand.mockReturnValue({
        pattern: "deepdive",
        confidence: 0.9,
      });

      // Act
      const result = await useCase.execute(mockAudioBlob);

      // Assert
      expect(result).toEqual({
        originalText: "詳しく調べて",
        pattern: "deepdive",
        confidence: 0.9,
        alternatives: [
          { transcript: "詳しく調べて", confidence: 0.95 },
          { transcript: "くわしく調べて", confidence: 0.87 },
        ],
        isPartial: false,
      });

      expect(mockTranscribeClient.transcribeAudio).toHaveBeenCalledWith(
        mockAudioBlob,
      );
      expect(mockVoiceDomainService.parseVoiceCommand).toHaveBeenCalledWith(
        "詳しく調べて",
      );
    });

    it("should handle transcription errors gracefully", async () => {
      // Arrange
      const mockAudioBlob = new Blob(["invalid audio"], { type: "audio/wav" });
      mockTranscribeClient.transcribeAudio.mockRejectedValue(
        new Error("Transcription failed"),
      );

      // Act & Assert
      await expect(useCase.execute(mockAudioBlob)).rejects.toThrow(
        "Voice command processing failed",
      );
    });

    it("should handle partial transcription results", async () => {
      // Arrange
      const mockAudioBlob = new Blob(["mock audio"], { type: "audio/wav" });

      mockTranscribeClient.transcribeAudio.mockResolvedValue({
        transcript: "詳し",
        confidence: 0.6,
        isPartial: true,
        alternatives: [{ transcript: "詳し", confidence: 0.6 }],
      });

      mockVoiceDomainService.parseVoiceCommand.mockReturnValue({
        pattern: null,
        confidence: 0.3,
      });

      // Act
      const result = await useCase.execute(mockAudioBlob);

      // Assert
      expect(result.pattern).toBeNull();
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it("should enhance confidence with alternatives when available", async () => {
      // Arrange
      const mockAudioBlob = new Blob(["mock audio"], { type: "audio/wav" });
      const mockAlternatives = [
        { transcript: "詳しく調べて", confidence: 0.95 },
        { transcript: "くわしく調べて", confidence: 0.87 },
      ];

      mockTranscribeClient.transcribeAudio.mockResolvedValue({
        transcript: "詳しく調べて",
        confidence: 0.95,
        isPartial: false,
        alternatives: mockAlternatives,
      });

      mockVoiceDomainService.parseVoiceCommand.mockReturnValue({
        pattern: "deepdive",
        confidence: 0.85,
      });

      mockVoiceDomainService.calculateConfidence.mockReturnValue(0.92);

      // Act
      const result = await useCase.execute(mockAudioBlob);

      // Assert
      expect(result.confidence).toBeCloseTo(0.92, 1);
      expect(mockVoiceDomainService.calculateConfidence).toHaveBeenCalledWith(
        "詳しく調べて",
        mockAlternatives,
      );
    });
  });

  describe("processRealTimeAudio", () => {
    it("should start real-time transcription and process commands", async () => {
      // Arrange
      const mockCallback = vi.fn();
      mockTranscribeClient.startRealTimeTranscription.mockResolvedValue();

      // Act
      await useCase.processRealTimeAudio(mockCallback);

      // Assert
      expect(
        mockTranscribeClient.startRealTimeTranscription,
      ).toHaveBeenCalled();
    });

    it("should handle real-time transcription errors", async () => {
      // Arrange
      const mockCallback = vi.fn();
      mockTranscribeClient.startRealTimeTranscription.mockRejectedValue(
        new Error("Real-time transcription failed"),
      );

      // Act & Assert
      await expect(useCase.processRealTimeAudio(mockCallback)).rejects.toThrow(
        "Real-time voice processing failed",
      );
    });
  });

  describe("stopProcessing", () => {
    it("should stop transcription successfully", async () => {
      // Arrange
      mockTranscribeClient.stopTranscription.mockResolvedValue();

      // Act
      await useCase.stopProcessing();

      // Assert
      expect(mockTranscribeClient.stopTranscription).toHaveBeenCalled();
    });
  });

  describe("checkSupport", () => {
    it("should return transcription support status", () => {
      // Arrange
      mockTranscribeClient.checkSupport.mockReturnValue(true);

      // Act
      const isSupported = useCase.checkSupport();

      // Assert
      expect(isSupported).toBe(true);
      expect(mockTranscribeClient.checkSupport).toHaveBeenCalled();
    });
  });
});
