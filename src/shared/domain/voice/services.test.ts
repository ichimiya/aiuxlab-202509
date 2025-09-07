import { describe, it, expect } from "vitest";
import { VoiceDomainService } from "./services";
import type { VoicePattern } from "../../api/generated/models";

describe("VoiceDomainService", () => {
  let voiceService: VoiceDomainService;

  beforeEach(() => {
    voiceService = new VoiceDomainService();
  });

  describe("parseVoiceCommand", () => {
    it("should parse deepdive commands correctly", () => {
      const testCases = [
        "詳しく調べて",
        "もっと調べて",
        "deep dive",
        "深掘りして",
      ];

      testCases.forEach((command) => {
        const result = voiceService.parseVoiceCommand(command);
        expect(result.pattern).toBe("deepdive");
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    it("should parse perspective commands correctly", () => {
      const testCases = [
        "別の観点で",
        "違う視点から",
        "他の見方で",
        "perspective",
      ];

      testCases.forEach((command) => {
        const result = voiceService.parseVoiceCommand(command);
        expect(result.pattern).toBe("perspective");
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    it("should parse concrete commands correctly", () => {
      const testCases = [
        "具体例を教えて",
        "事例を見せて",
        "実例はある？",
        "concrete example",
      ];

      testCases.forEach((command) => {
        const result = voiceService.parseVoiceCommand(command);
        expect(result.pattern).toBe("concrete");
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });

    it("should parse data commands correctly", () => {
      const testCases = [
        "データを教えて",
        "統計は？",
        "数字で見せて",
        "show me data",
      ];

      testCases.forEach((command) => {
        const result = voiceService.parseVoiceCommand(command);
        expect(result.pattern).toBe("data");
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });

    it("should handle unknown commands", () => {
      const result = voiceService.parseVoiceCommand("天気はどう？");
      expect(result.pattern).toBeNull();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("should handle mixed language commands", () => {
      const result = voiceService.parseVoiceCommand("詳しくshow me more");
      expect(result.pattern).toBe("deepdive");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should handle empty or invalid input", () => {
      expect(() => voiceService.parseVoiceCommand("")).toThrow(
        "Invalid voice command",
      );
      expect(() => voiceService.parseVoiceCommand("   ")).toThrow(
        "Invalid voice command",
      );
    });
  });

  describe("calculateConfidence", () => {
    it("should calculate high confidence for exact matches", () => {
      const transcript = "詳しく調べて";
      const alternatives = [
        { transcript: "詳しく調べて", confidence: 0.95 },
        { transcript: "くわしく調べて", confidence: 0.87 },
      ];

      const confidence = voiceService.calculateConfidence(
        transcript,
        alternatives,
      );
      expect(confidence).toBeGreaterThan(0.9);
    });

    it("should calculate medium confidence for partial matches", () => {
      const transcript = "詳しく";
      const alternatives = [
        { transcript: "詳しく", confidence: 0.8 },
        { transcript: "詳しい", confidence: 0.6 },
      ];

      const confidence = voiceService.calculateConfidence(
        transcript,
        alternatives,
      );
      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThan(0.9);
    });

    it("should calculate low confidence for poor matches", () => {
      const transcript = "はくたい";
      const alternatives = [
        { transcript: "はくたい", confidence: 0.3 },
        { transcript: "薄い", confidence: 0.2 },
      ];

      const confidence = voiceService.calculateConfidence(
        transcript,
        alternatives,
      );
      expect(confidence).toBeLessThan(0.5);
    });
  });

  describe("normalizeVoiceInput", () => {
    it("should remove unnecessary characters", () => {
      const input = "詳しく、調べて！";
      const result = voiceService.normalizeVoiceInput(input);
      expect(result).toBe("詳しく 調べて");
    });

    it("should convert to lowercase for English", () => {
      const input = "DEEP DIVE Please!";
      const result = voiceService.normalizeVoiceInput(input);
      expect(result).toBe("deep dive please");
    });

    it("should handle mixed language input", () => {
      const input = "詳しく、Deep Dive！";
      const result = voiceService.normalizeVoiceInput(input);
      expect(result).toBe("詳しく deep dive");
    });

    it("should trim whitespace", () => {
      const input = "  詳しく調べて  ";
      const result = voiceService.normalizeVoiceInput(input);
      expect(result).toBe("詳しく調べて");
    });
  });

  describe("getAllPatterns", () => {
    it("should return all available voice patterns", () => {
      const patterns = voiceService.getAllPatterns();
      expect(patterns).toContain("deepdive");
      expect(patterns).toContain("perspective");
      expect(patterns).toContain("concrete");
      expect(patterns).toContain("data");
      expect(patterns).toContain("compare");
      expect(patterns).toContain("trend");
      expect(patterns).toContain("practical");
      expect(patterns).toContain("summary");
    });
  });
});
