import { describe, it, expect, beforeEach } from "vitest";
import { ResearchDomainService } from "./services";
import type {
  PerplexityResponse,
  ResearchContext,
} from "../../infrastructure/external/perplexity";

describe("ResearchDomainService (Domain Layer)", () => {
  let service: ResearchDomainService;

  beforeEach(() => {
    service = new ResearchDomainService();
  });

  describe("transformToResearch", () => {
    it("Perplexity応答をResearchドメインモデルに変換", () => {
      const context: ResearchContext = {
        query: "テストクエリ",
        researchId: "test-research-id",
      };

      const response: PerplexityResponse = {
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
        citations: ["https://example.com/1"],
        search_results: [
          {
            title: "テスト記事1",
            url: "https://example.com/1",
            snippet: "テストスニペット1",
            date: "2024-01-01",
          },
        ],
      };

      const result = service.transformToResearch(context, response);

      expect(result).toMatchObject({
        id: "test-research-id",
        query: "テストクエリ",
        status: "completed",
        results: expect.arrayContaining([
          expect.objectContaining({
            content: "テスト結果のコンテンツ",
            source: "perplexity",
            relevanceScore: 1.0,
            processedCitations: expect.arrayContaining([
              expect.objectContaining({
                url: "https://example.com/1",
                title: "テスト記事1",
                number: 1,
                domain: "example.com",
              }),
            ]),
          }),
        ]),
        searchResults: expect.arrayContaining([
          expect.objectContaining({
            title: "テスト記事1",
            url: "https://example.com/1",
            snippet: "テストスニペット1",
            relevanceScore: expect.any(Number),
            lastUpdated: "2024-01-01T00:00:00.000Z",
          }),
        ]),
        citations: ["https://example.com/1"],
      });
    });
  });

  describe("calculateRelevanceScore", () => {
    it("クエリと結果の関連度を計算", () => {
      const result = {
        title: "React Testing Library Guide",
        url: "https://example.com",
        snippet: "Learn how to test React components effectively",
      };

      const score = service.calculateRelevanceScore(result, "React testing");

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBe(1.0); // "React" と "testing" 両方がマッチ
    });

    it("関連度がない場合は0を返す", () => {
      const result = {
        title: "Angular Documentation",
        url: "https://angular.io",
        snippet: "Official Angular framework guide",
      };

      const score = service.calculateRelevanceScore(result, "React testing");

      expect(score).toBe(0);
    });
  });

  describe("findTitleForUrl", () => {
    it("URLに対応するタイトルを検索", () => {
      const searchResults = [
        {
          title: "Title 1",
          url: "https://example.com/1",
          snippet: "snippet 1",
        },
        {
          title: "Title 2",
          url: "https://example.com/2",
          snippet: "snippet 2",
        },
      ];

      expect(
        service.findTitleForUrl("https://example.com/1", searchResults),
      ).toBe("Title 1");
      expect(
        service.findTitleForUrl("https://example.com/3", searchResults),
      ).toBeUndefined();
    });
  });

  describe("extractDomain", () => {
    it("URLからドメインを抽出", () => {
      expect(service.extractDomain("https://example.com/path")).toBe(
        "example.com",
      );
      expect(
        service.extractDomain("http://subdomain.example.org/page?query=1"),
      ).toBe("subdomain.example.org");
    });

    it("無効なURLの場合は元の文字列を返す", () => {
      expect(service.extractDomain("invalid-url")).toBe("invalid-url");
    });

    it("undefined の場合は undefined を返す", () => {
      expect(service.extractDomain(undefined)).toBeUndefined();
    });
  });
});
