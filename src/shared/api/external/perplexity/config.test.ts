import { describe, it, expect } from "vitest";
import { PerplexityConfig } from "./config";

describe("PerplexityConfig", () => {
  describe("デフォルト設定", () => {
    it("DEFAULT_API_CONFIGが正しい値を持つ", () => {
      expect(PerplexityConfig.DEFAULT_API_CONFIG).toEqual({
        BASE_URL: "https://api.perplexity.ai",
        MODEL: "llama-3.1-sonar-large-128k-online",
        TIMEOUT: 30000,
        MAX_TOKENS: 2000,
        TEMPERATURE: 0.2,
      });
    });

    it("ENDPOINTSが正しく定義されている", () => {
      expect(PerplexityConfig.ENDPOINTS.CHAT_COMPLETIONS).toBe(
        "/chat/completions",
      );
    });

    it("PROMPT_TEMPLATESが正しく定義されている", () => {
      expect(PerplexityConfig.PROMPT_TEMPLATES).toHaveProperty("SYSTEM_BASE");
      expect(PerplexityConfig.PROMPT_TEMPLATES).toHaveProperty(
        "SYSTEM_SELECTED_TEXT",
      );
      expect(PerplexityConfig.PROMPT_TEMPLATES).toHaveProperty(
        "SYSTEM_CLOSING",
      );
    });

    it("VOICE_COMMAND_INSTRUCTIONSが正しく定義されている", () => {
      expect(PerplexityConfig.VOICE_COMMAND_INSTRUCTIONS).toHaveProperty(
        "deepdive",
      );
      expect(PerplexityConfig.VOICE_COMMAND_INSTRUCTIONS).toHaveProperty(
        "perspective",
      );
      expect(PerplexityConfig.VOICE_COMMAND_INSTRUCTIONS).toHaveProperty(
        "concrete",
      );
    });

    it("RESEARCH_CONSTANTSが正しく定義されている", () => {
      expect(PerplexityConfig.RESEARCH_CONSTANTS).toHaveProperty(
        "SOURCE_NAME",
        "Perplexity AI",
      );
      expect(PerplexityConfig.RESEARCH_CONSTANTS).toHaveProperty(
        "MIN_RELEVANCE_SCORE",
        0.1,
      );
      expect(PerplexityConfig.RESEARCH_CONSTANTS).toHaveProperty(
        "MAX_RELEVANCE_SCORE",
        1.0,
      );
    });
  });

  describe("設定の統合性", () => {
    it("すべての音声コマンドに対応する指示が存在する", () => {
      const expectedCommands = [
        "deepdive",
        "perspective",
        "concrete",
        "data",
        "compare",
        "trend",
        "practical",
        "summary",
      ];

      for (const command of expectedCommands) {
        expect(PerplexityConfig.VOICE_COMMAND_INSTRUCTIONS).toHaveProperty(
          command,
        );
        expect(
          typeof PerplexityConfig.VOICE_COMMAND_INSTRUCTIONS[
            command as keyof typeof PerplexityConfig.VOICE_COMMAND_INSTRUCTIONS
          ],
        ).toBe("string");
      }
    });

    it("定数値の妥当性チェック", () => {
      expect(PerplexityConfig.DEFAULT_API_CONFIG.TIMEOUT).toBeGreaterThan(0);
      expect(PerplexityConfig.DEFAULT_API_CONFIG.MAX_TOKENS).toBeGreaterThan(0);
      expect(
        PerplexityConfig.DEFAULT_API_CONFIG.TEMPERATURE,
      ).toBeGreaterThanOrEqual(0);
      expect(
        PerplexityConfig.DEFAULT_API_CONFIG.TEMPERATURE,
      ).toBeLessThanOrEqual(2);
    });
  });
});
