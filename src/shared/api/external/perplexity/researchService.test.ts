import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ResearchService } from "./researchService";
import { PerplexityClient } from "./client";
import type { ResearchContext, PerplexityResponse } from "./types";

// PerplexityClientをモック
vi.mock("./client");
const MockedPerplexityClient = vi.mocked(PerplexityClient);

describe("ResearchService", () => {
  let service: ResearchService;
  let mockClient: {
    search: ReturnType<typeof vi.fn>;
  };

  const mockApiKey = "test-perplexity-key";

  beforeEach(() => {
    vi.clearAllMocks();

    // PerplexityClientのモックインスタンス作成
    mockClient = {
      search: vi.fn(),
    };

    MockedPerplexityClient.mockImplementation(
      () => mockClient as unknown as PerplexityClient,
    );

    service = new ResearchService(mockApiKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("APIキーが未設定の場合はエラーが発生する", () => {
      expect(() => {
        new ResearchService("");
      }).toThrow("Perplexity API key is required");
    });

    it("正常な設定でインスタンスが作成できる", () => {
      expect(() => {
        new ResearchService(mockApiKey);
      }).not.toThrow();
    });
  });

  describe("executeResearch", () => {
    it("基本的なリサーチクエリが正常に実行される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "AI技術の最新動向について教えて",
      };

      const mockPerplexityResponse: PerplexityResponse = {
        id: "chatcmpl-test123",
        object: "chat.completion",
        created: 1642780800,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "AI技術の最新動向について詳しく説明します...",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 150,
          total_tokens: 175,
        },
      };

      mockClient.search.mockResolvedValueOnce(mockPerplexityResponse);

      // Act
      const result = await service.executeResearch(context);

      // Assert
      expect(mockClient.search).toHaveBeenCalledTimes(1);
      expect(mockClient.search).toHaveBeenCalledWith(context);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("query", context.query);
      expect(result).toHaveProperty("status", "completed");
      expect(result).toHaveProperty("results");
      expect(result.results).toBeDefined();
      expect(result.results!).toHaveLength(1);
      expect(result.results![0].content).toContain("AI技術の最新動向について");
    });

    it("選択テキスト付きリサーチクエリが正常に実行される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "これについて詳しく説明して",
        selectedText: "量子コンピューティング",
      };

      const mockPerplexityResponse: PerplexityResponse = {
        id: "chatcmpl-test456",
        object: "chat.completion",
        created: 1642780900,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "量子コンピューティングは、量子力学の原理を利用した...",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 200,
          total_tokens: 230,
        },
      };

      mockClient.search.mockResolvedValueOnce(mockPerplexityResponse);

      // Act
      const result = await service.executeResearch(context);

      // Assert
      expect(mockClient.search).toHaveBeenCalledWith(context);
      expect(result.results![0].content).toContain("量子コンピューティング");
      expect(result.results![0]).toHaveProperty("source", "Perplexity AI");
    });

    it("音声コマンド付きリサーチクエリが正常に実行される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "ブロックチェーン技術について",
        voiceCommand: "deepdive",
      };

      const mockPerplexityResponse: PerplexityResponse = {
        id: "chatcmpl-test789",
        object: "chat.completion",
        created: 1642781000,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "ブロックチェーン技術の詳細な分析を行います...",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 35,
          completion_tokens: 250,
          total_tokens: 285,
        },
      };

      mockClient.search.mockResolvedValueOnce(mockPerplexityResponse);

      // Act
      const result = await service.executeResearch(context);

      // Assert
      expect(result.results![0]).toHaveProperty("voicePattern", "deepdive");
      expect(result.results?.[0].content).toContain("詳細な分析");
    });

    it("複数の選択肢があるレスポンスを正しく処理する", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "機械学習のアルゴリズム",
      };

      const mockPerplexityResponse: PerplexityResponse = {
        id: "chatcmpl-multi",
        object: "chat.completion",
        created: 1642781100,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "教師あり学習のアルゴリズムには...",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
          {
            index: 1,
            message: {
              role: "assistant",
              content: "教師なし学習のアプローチとして...",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 180,
          total_tokens: 200,
        },
      };

      mockClient.search.mockResolvedValueOnce(mockPerplexityResponse);

      // Act
      const result = await service.executeResearch(context);

      // Assert
      expect(result.results!).toHaveLength(2);
      expect(result.results![0].content).toContain("教師あり学習");
      expect(result.results![1].content).toContain("教師なし学習");
    });

    it("APIエラーが発生した場合は適切にハンドリングされる", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "テストクエリ",
      };

      const apiError = new Error("Rate limit exceeded");
      mockClient.search.mockRejectedValueOnce(apiError);

      // Act & Assert
      await expect(service.executeResearch(context)).rejects.toThrow(
        "Failed to execute research: Rate limit exceeded",
      );
    });

    it("空のレスポンスの場合は適切にハンドリングされる", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "テストクエリ",
      };

      const emptyResponse: PerplexityResponse = {
        id: "chatcmpl-empty",
        object: "chat.completion",
        created: 1642781200,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockClient.search.mockResolvedValueOnce(emptyResponse);

      // Act
      const result = await service.executeResearch(context);

      // Assert
      expect(result.status).toBe("failed");
      expect(result.results).toHaveLength(0);
    });

    describe("詳細エラーハンドリング", () => {
      it("PerplexityAPIErrorはユーザー向けメッセージ付きで処理される", async () => {
        // Arrange
        const context: ResearchContext = {
          query: "テストクエリ",
        };

        mockClient.search.mockRejectedValueOnce(
          new Error("PerplexityAPIError"),
        );

        // Act & Assert
        await expect(service.executeResearch(context)).rejects.toThrow(
          "Failed to execute research: PerplexityAPIError",
        );
      });

      it("レート制限エラーは適切にハンドリングされる", async () => {
        // Arrange
        const context: ResearchContext = {
          query: "テストクエリ",
        };

        mockClient.search.mockRejectedValueOnce(
          new Error("Rate limit exceeded"),
        );

        // Act & Assert
        await expect(service.executeResearch(context)).rejects.toThrow(
          "Failed to execute research: Rate limit exceeded",
        );
      });

      it("ネットワークエラーは適切にハンドリングされる", async () => {
        // Arrange
        const context: ResearchContext = {
          query: "テストクエリ",
        };

        mockClient.search.mockRejectedValueOnce(
          new Error("Network connection failed"),
        );

        // Act & Assert
        await expect(service.executeResearch(context)).rejects.toThrow(
          "Failed to execute research: Network connection failed",
        );
      });

      it("不明なエラーは適切にハンドリングされる", async () => {
        // Arrange
        const context: ResearchContext = {
          query: "テストクエリ",
        };

        mockClient.search.mockRejectedValueOnce("Unknown error");

        // Act & Assert
        await expect(service.executeResearch(context)).rejects.toThrow(
          "Failed to execute research: Unknown error",
        );
      });

      it("null値のエラーは適切にハンドリングされる", async () => {
        // Arrange
        const context: ResearchContext = {
          query: "テストクエリ",
        };

        mockClient.search.mockRejectedValueOnce(null);

        // Act & Assert
        await expect(service.executeResearch(context)).rejects.toThrow(
          "Failed to execute research: Unknown error occurred",
        );
      });
    });
  });

  describe("enrichResearchResult", () => {
    it("リサーチ結果に関連度スコアが適切に計算される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "artificial intelligence machine learning",
      };

      const mockResponse: PerplexityResponse = {
        id: "chatcmpl-score",
        object: "chat.completion",
        created: 1642781300,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content:
                "Artificial intelligence and machine learning are closely related technical fields that power modern AI systems...",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 100,
          total_tokens: 115,
        },
      };

      mockClient.search.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.executeResearch(context);

      // Assert
      expect(result.results![0]).toHaveProperty("relevanceScore");
      // 改善されたアルゴリズムでは、完全一致するキーワードが含まれているため高スコア
      expect(result.results![0].relevanceScore).toBeGreaterThan(0.3);
      expect(result.results![0].relevanceScore).toBeLessThanOrEqual(1.0);
    });

    it("リサーチ結果にタイムスタンプが設定される", async () => {
      // Arrange
      const context: ResearchContext = {
        query: "テスト",
      };

      const mockResponse: PerplexityResponse = {
        id: "chatcmpl-timestamp",
        object: "chat.completion",
        created: 1642781400,
        model: "llama-3.1-sonar-large-128k-online",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "テスト結果",
              refusal: null,
            },
            logprobs: null,
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockClient.search.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await service.executeResearch(context);

      // Assert
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
      expect(new Date(result.createdAt)).toBeInstanceOf(Date);
    });
  });
});
