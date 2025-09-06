import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecuteResearchUseCase, createExecuteResearchUseCase } from "./index";
import type {
  IResearchAPIRepository,
  PerplexityResponse,
  ResearchContext,
} from "../../infrastructure/external/perplexity";

describe("ExecuteResearchUseCase (Application Layer)", () => {
  let useCase: ExecuteResearchUseCase;
  let mockRepository: IResearchAPIRepository;

  beforeEach(() => {
    mockRepository = {
      search: vi.fn(),
    };

    useCase = new ExecuteResearchUseCase(mockRepository);
  });

  describe("execute", () => {
    it("正常なリサーチフローを実行", async () => {
      const mockResponse: PerplexityResponse = {
        id: "test-id",
        object: "chat.completion",
        created: Date.now(),
        model: "sonar",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "テスト結果のコンテンツ",
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
        citations: ["https://example.com"],
        search_results: [
          {
            title: "テスト記事",
            url: "https://example.com",
            snippet: "テストスニペット",
          },
        ],
      };

      vi.mocked(mockRepository.search).mockResolvedValueOnce(mockResponse);

      const context: ResearchContext = {
        query: "テストクエリ",
        researchId: "test-research-id",
      };

      const result = await useCase.execute(context);

      expect(mockRepository.search).toHaveBeenCalledWith(context);
      expect(result).toMatchObject({
        id: "test-research-id",
        query: "テストクエリ",
        status: "completed",
        results: expect.arrayContaining([
          expect.objectContaining({
            content: "テスト結果のコンテンツ",
            source: "perplexity",
          }),
        ]),
        searchResults: expect.arrayContaining([
          expect.objectContaining({
            title: "テスト記事",
            url: "https://example.com",
          }),
        ]),
        citations: ["https://example.com"],
      });
    });

    it("API エラーを適切に再throw", async () => {
      const apiError = new Error("API error");
      apiError.name = "PerplexityAPIError";

      vi.mocked(mockRepository.search).mockRejectedValueOnce(apiError);

      const context: ResearchContext = {
        query: "テストクエリ",
      };

      await expect(useCase.execute(context)).rejects.toThrow(apiError);
    });

    it("その他のエラーを適切にラップ", async () => {
      const genericError = new Error("Generic error");
      vi.mocked(mockRepository.search).mockRejectedValueOnce(genericError);

      const context: ResearchContext = {
        query: "テストクエリ",
      };

      await expect(useCase.execute(context)).rejects.toThrow(
        "Research execution failed: Generic error",
      );
    });
  });
});

describe("createExecuteResearchUseCase (Factory)", () => {
  it("ファクトリ関数でユースケースを作成", () => {
    const useCase = createExecuteResearchUseCase("test-api-key");

    expect(useCase).toBeInstanceOf(ExecuteResearchUseCase);
  });
});
