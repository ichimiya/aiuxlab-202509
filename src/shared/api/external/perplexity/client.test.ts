import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PerplexityClient } from "./client";
import type { PerplexityConfig, ResearchContext } from "./types";

// モック設定
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PerplexityClient", () => {
  let client: PerplexityClient;
  const mockConfig: PerplexityConfig = {
    apiKey: "test-api-key",
    model: "llama-3.1-sonar-large-128k-online",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("APIキーが未設定の場合はエラーが発生する", () => {
      expect(() => {
        new PerplexityClient({ ...mockConfig, apiKey: "" });
      }).toThrow("Perplexity API key is required");
    });

    it("正常な設定でインスタンスが作成できる", () => {
      expect(() => {
        client = new PerplexityClient(mockConfig);
      }).not.toThrow();
    });
  });

  describe("search", () => {
    beforeEach(() => {
      client = new PerplexityClient(mockConfig);
    });

    it("基本的なリサーチクエリが正常に送信される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "AI技術の最新トレンド",
      };

      const mockResponse = {
        id: "chatcmpl-test",
        object: "chat.completion",
        created: Date.now(),
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "AI技術の最新トレンドについての回答...",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 100,
          total_tokens: 120,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await client.search(context);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.perplexity.ai/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining(context.query),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("選択テキストがある場合はコンテキストに含める", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "詳しく教えて",
        selectedText: "機械学習は人工知能の一分野である",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "test",
            object: "chat.completion",
            created: Date.now(),
            model: "test",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "test response" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 10,
              total_tokens: 20,
            },
          }),
      });

      // Act
      await client.search(context);

      // Assert
      const callArgs = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(callArgs.body);
      expect(requestBody.messages[0].content).toContain(context.selectedText);
      expect(requestBody.messages[1].content).toContain(context.query);
    });

    it("音声コマンドがある場合はプロンプトに反映される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "AI技術について",
        voiceCommand: "deepdive",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "test",
            object: "chat.completion",
            created: Date.now(),
            model: "test",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "test response" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 10,
              total_tokens: 20,
            },
          }),
      });

      // Act
      await client.search(context);

      // Assert
      const callArgs = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(callArgs.body);
      expect(requestBody.messages[0].content).toContain("詳細に掘り下げて");
    });

    it("APIエラーが発生した場合は適切にハンドリングされる", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "テストクエリ",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: {
              message: "Invalid API key",
              type: "authentication_error",
              code: "invalid_api_key",
            },
          }),
      });

      // Act & Assert
      await expect(client.search(context)).rejects.toThrow("Invalid API key");
    });

    it("ネットワークエラーが発生した場合は適切にハンドリングされる", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "テストクエリ",
      };

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Act & Assert
      await expect(client.search(context)).rejects.toThrow("Network error");
    });

    describe("詳細エラーハンドリング", () => {
      const context: ResearchContext = { query: "テストクエリ" };

      it("レート制限エラー（429）は詳細情報付きで処理される", async () => {
        const mockErrorResponse = {
          error: {
            message: "Rate limit exceeded",
            type: "rate_limit_error",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({
            "content-type": "application/json",
            "retry-after": "60",
          }),
          json: () => Promise.resolve(mockErrorResponse),
        });

        try {
          await client.search(context);
          expect.fail("Expected error to be thrown");
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.name).toBe("PerplexityAPIError");
            expect(error.message).toContain("Rate limit exceeded");
          }
        }
      });

      it("認証エラー（401）は詳細情報付きで処理される", async () => {
        const mockErrorResponse = {
          error: {
            message: "Invalid API key",
            type: "authentication_error",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockErrorResponse),
        });

        try {
          await client.search(context);
          expect.fail("Expected error to be thrown");
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.name).toBe("PerplexityAPIError");
            expect(error.message).toContain("Invalid API key");
          }
        }
      });

      it("サービス利用不可エラー（503）は詳細情報付きで処理される", async () => {
        const mockErrorResponse = {
          error: {
            message: "Service temporarily unavailable",
            type: "service_unavailable",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(mockErrorResponse),
        });

        try {
          await client.search(context);
          expect.fail("Expected error to be thrown");
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.name).toBe("PerplexityAPIError");
            expect(error.message).toContain("Service temporarily unavailable");
          }
        }
      });

      it("タイムアウトエラーは詳細情報付きで処理される", async () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        mockFetch.mockRejectedValueOnce(abortError);

        try {
          await client.search(context);
          expect.fail("Expected error to be thrown");
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.name).toBe("PerplexityAPIError");
            expect(error.message).toContain("The operation was aborted"); // リファクタリング後の正確なエラーメッセージ
          }
        }
      });

      it("ネットワーク接続エラーは詳細情報付きで処理される", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

        try {
          await client.search(context);
          expect.fail("Expected error to be thrown");
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.name).toBe("PerplexityAPIError");
            expect(error.message).toContain("Failed to fetch"); // リファクタリング後の正確なエラーメッセージ
          }
        }
      });

      it("不正なレスポンス形式は詳細情報付きで処理される", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ invalid: "response" }),
        });

        try {
          await client.search(context);
          expect.fail("Expected error to be thrown");
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.name).toBe("PerplexityAPIError");
            expect(error.message).toContain("Invalid response format");
          }
        }
      });

      it("空のレスポンスは詳細情報付きで処理される", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              id: "test",
              object: "chat.completion",
              created: Date.now(),
              model: "test",
              choices: [],
              usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              },
            }),
        });

        try {
          await client.search(context);
          expect.fail("Expected error to be thrown");
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          if (error instanceof Error) {
            expect(error.name).toBe("PerplexityAPIError");
            expect(error.message).toContain("Empty response received");
          }
        }
      });
    });
  });

  describe("プロンプト構築のテスト（search経由）", () => {
    beforeEach(() => {
      client = new PerplexityClient(mockConfig);
    });

    it("基本クエリのプロンプトが正しく送信される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "AI技術について教えて",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "test",
            object: "chat.completion",
            created: Date.now(),
            model: "test",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "test response" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 10,
              total_tokens: 20,
            },
          }),
      });

      // Act
      await client.search(context);

      // Assert
      const callArgs = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(callArgs.body);
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0].role).toBe("system");
      expect(requestBody.messages[1].role).toBe("user");
      expect(requestBody.messages[1].content).toContain(context.query);
    });

    it("選択テキスト付きクエリのプロンプトが正しく送信される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "詳しく説明して",
        selectedText: "量子コンピューターの原理",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "test",
            object: "chat.completion",
            created: Date.now(),
            model: "test",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "test response" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 10,
              total_tokens: 20,
            },
          }),
      });

      // Act
      await client.search(context);

      // Assert
      const callArgs = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(callArgs.body);
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0].content).toContain(context.selectedText);
      expect(requestBody.messages[1].content).toContain(context.query);
    });
  });
});
