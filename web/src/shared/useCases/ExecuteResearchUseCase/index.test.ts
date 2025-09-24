import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecuteResearchUseCase, createExecuteResearchUseCase } from "./index";
import { ApplicationError } from "../errors";
import type {
  IResearchAPIRepository,
  PerplexityResponse,
  ResearchContext,
} from "../../infrastructure/external/search/types";
import type { ContentProcessingPort } from "../ports/contentProcessing";
import { ResearchDomainService } from "../../domain/research/services";

describe("ExecuteResearchUseCase (Application Layer)", () => {
  let useCase: ExecuteResearchUseCase;
  let mockRepository: IResearchAPIRepository;
  let mockContentPort: ContentProcessingPort;

  beforeEach(() => {
    mockRepository = {
      search: vi.fn(),
    };

    mockContentPort = {
      process: vi.fn(),
    };

    const researchDomainService = new ResearchDomainService(mockContentPort);
    useCase = new ExecuteResearchUseCase(mockRepository, researchDomainService);
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
      vi.mocked(mockContentPort.process).mockResolvedValueOnce({
        htmlContent: "<p><strong>テスト結果のコンテンツ</strong></p>",
        processedCitations: [
          {
            id: "ref1",
            number: 1,
            url: "https://example.com",
            title: "テスト記事",
            domain: "example.com",
          },
        ],
      });

      const context: ResearchContext = {
        query: "テストクエリ",
        researchId: "test-research-id",
      };

      const result = await useCase.execute(context);

      expect(mockRepository.search).toHaveBeenCalledWith(context);
      expect(mockContentPort.process).toHaveBeenCalled();
      expect(result.id).toBe("test-research-id");
      expect(result.query).toBe("テストクエリ");
      expect(result.status).toBe("completed");
      expect(result.citations).toEqual(["https://example.com"]);
      expect(result.searchResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "テスト記事",
            url: "https://example.com",
          }),
        ]),
      );

      expect(result.results).toHaveLength(1);
      const [firstResult] = result.results ?? [];
      expect(firstResult).toMatchObject({
        content: "テスト結果のコンテンツ",
        source: "perplexity",
      });
      expect(firstResult.htmlContent).toMatch(
        /<strong[^>]*>テスト結果のコンテンツ<\/strong>/,
      );
      expect(firstResult.processedCitations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "ref1",
            number: 1,
            url: "https://example.com",
            title: "テスト記事",
            domain: "example.com",
          }),
        ]),
      );
    });

    it("API エラーをApplicationErrorでラップ", async () => {
      const apiError = new Error("API error");
      apiError.name = "PerplexityAPIError";

      vi.mocked(mockRepository.search).mockRejectedValue(apiError);

      const context: ResearchContext = {
        query: "テストクエリ",
      };

      const promise = useCase.execute(context);
      await expect(promise).rejects.toBeInstanceOf(ApplicationError);
      await expect(promise).rejects.toMatchObject({
        code: "UPSTREAM_ERROR",
        status: 502,
      });
    });

    it("その他のエラーをApplicationErrorでラップ", async () => {
      const genericError = new Error("Generic error");
      vi.mocked(mockRepository.search).mockRejectedValueOnce(genericError);

      const context: ResearchContext = {
        query: "テストクエリ",
      };

      await expect(useCase.execute(context)).rejects.toBeInstanceOf(
        ApplicationError,
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
