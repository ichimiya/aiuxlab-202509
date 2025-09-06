import { describe, it, expect } from "vitest";
import { TypeGuards, StrictValidators } from "./typeGuards";
import type {
  PerplexityResponse,
  PerplexityRequest,
  ResearchContext,
} from "./types";

describe("TypeGuards", () => {
  describe("PerplexityResponse型ガード", () => {
    it("正しいレスポンス形式を検証する", () => {
      const validResponse: PerplexityResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1642780800,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Test response",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      expect(TypeGuards.isPerplexityResponse(validResponse)).toBe(true);
    });

    it("不正なレスポンス形式を検出する", () => {
      const invalidResponses = [
        null,
        undefined,
        {},
        { id: "test" },
        { id: "test", choices: [] },
        { id: "test", choices: [{ message: {} }] },
        { id: "test", choices: [{ message: { content: "test" } }] },
      ];

      invalidResponses.forEach((response) => {
        expect(TypeGuards.isPerplexityResponse(response)).toBe(false);
      });
    });

    it("部分的に正しいレスポンスも厳密に検証する", () => {
      const partialResponse = {
        id: "chatcmpl-123",
        choices: [
          {
            message: { content: "Test" }, // role が欠落
          },
        ],
      };

      expect(TypeGuards.isPerplexityResponse(partialResponse)).toBe(false);
    });
  });

  describe("ResearchContext型ガード", () => {
    it("正しいリサーチコンテキストを検証する", () => {
      const validContexts: ResearchContext[] = [
        { query: "test query" },
        { query: "test query", selectedText: "selected" },
        { query: "test query", voiceCommand: "deepdive" },
        {
          query: "test query",
          selectedText: "selected",
          voiceCommand: "summary",
        },
      ];

      validContexts.forEach((context) => {
        expect(TypeGuards.isResearchContext(context)).toBe(true);
      });
    });

    it("不正なリサーチコンテキストを検出する", () => {
      const invalidContexts = [
        null,
        undefined,
        {},
        { query: "" },
        { query: "   " },
        { selectedText: "text" }, // query が欠落
        { query: "test", voiceCommand: 123 }, // voiceCommand が文字列でない
      ];

      invalidContexts.forEach((context) => {
        expect(TypeGuards.isResearchContext(context)).toBe(false);
      });
    });
  });

  describe("音声コマンド型ガード", () => {
    it("有効な音声コマンドを検証する", () => {
      const validCommands = [
        "deepdive",
        "perspective",
        "concrete",
        "data",
        "compare",
        "trend",
        "practical",
        "summary",
      ];

      validCommands.forEach((command) => {
        expect(TypeGuards.isValidVoiceCommand(command)).toBe(true);
      });
    });

    it("無効な音声コマンドを検出する", () => {
      const invalidCommands = [
        "",
        "  ",
        "invalid",
        "DEEPDIVE",
        "deep-dive",
        null,
        undefined,
        123,
      ];

      invalidCommands.forEach((command) => {
        expect(TypeGuards.isValidVoiceCommand(command)).toBe(false);
      });
    });
  });
});

describe("StrictValidators", () => {
  describe("厳密なバリデーション", () => {
    it("APIキーを厳密に検証する", () => {
      expect(StrictValidators.validateApiKey("valid-api-key")).toBe(true);
      expect(StrictValidators.validateApiKey("")).toBe(false);
      expect(StrictValidators.validateApiKey("   ")).toBe(false);
      expect(StrictValidators.validateApiKey(null)).toBe(false);
      expect(StrictValidators.validateApiKey(undefined)).toBe(false);
    });

    it("リクエストペイロードを厳密に検証する", () => {
      const validRequest: PerplexityRequest = {
        model: "test-model",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 100,
      };

      expect(StrictValidators.validateRequest(validRequest)).toBe(true);
      expect(StrictValidators.validateRequest({})).toBe(false);
      expect(StrictValidators.validateRequest(null)).toBe(false);
    });

    it("レスポンスデータを厳密に検証する", () => {
      const validResponse = {
        id: "test-id",
        object: "chat.completion",
        created: 1642780800,
        model: "test-model",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "test", refusal: null },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      expect(StrictValidators.validateResponseData(validResponse)).toBe(true);
      expect(StrictValidators.validateResponseData({})).toBe(false);
      expect(StrictValidators.validateResponseData(null)).toBe(false);
    });
  });

  describe("型安全な変換", () => {
    it("unknown型を安全に変換する", () => {
      const unknownData: unknown = {
        id: "test-id",
        object: "chat.completion",
        created: 1642780800,
        model: "test-model",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "test", refusal: null },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      const result = StrictValidators.safeParseResponse(unknownData);

      if (result.success) {
        expect(result.data.id).toBe("test-id");
        expect(result.data.choices).toHaveLength(1);
      } else {
        expect.fail("Should successfully parse valid data");
      }
    });

    it("不正なデータの変換でエラーを返す", () => {
      const invalidData: unknown = { invalid: "data" };

      const result = StrictValidators.safeParseResponse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid response format");
      }
    });
  });

  describe("ランタイム型チェック", () => {
    it("実行時に型を厳密にチェックする", () => {
      const data: unknown = {
        query: "test query",
        selectedText: "selected text",
        voiceCommand: "deepdive",
      };

      expect(() => StrictValidators.assertResearchContext(data)).not.toThrow();

      // 型が確定した後はTypeScriptで型安全になる
      const context = data as ResearchContext;
      expect(context.query).toBe("test query");
    });

    it("型チェック失敗時に例外を投げる", () => {
      const invalidData: unknown = { invalid: "data" };

      expect(() => {
        StrictValidators.assertResearchContext(invalidData);
      }).toThrow("Invalid ResearchContext");
    });
  });
});
