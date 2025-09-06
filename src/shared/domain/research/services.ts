/**
 * Research Domain Services
 * ビジネスルールとドメインロジック（ドメイン層）
 */

import type {
  Research,
  ResearchResult,
  SearchResult,
} from "../../api/generated/models";
import type {
  PerplexityResponse,
  PerplexitySearchResult,
  ResearchContext,
} from "../../infrastructure/external/perplexity";

// ========================================
// Domain Services
// ========================================

export class ResearchDomainService {
  /**
   * Perplexity応答をドメインモデルに変換
   */
  transformToResearch(
    context: ResearchContext,
    response: PerplexityResponse,
  ): Research {
    const content = response.choices[0]?.message?.content || "";
    const citations = response.citations || [];
    const searchResults = response.search_results || [];

    // 検索結果をSearchResult形式に変換
    const transformedSearchResults = this.transformSearchResults(
      searchResults,
      context.query,
    );

    // ResearchResultを構築
    const researchResult = this.createResearchResult(
      context,
      content,
      citations,
      searchResults,
    );

    return {
      id: context.researchId || `research-${Date.now()}`,
      query: context.query,
      status: "completed",
      results: [researchResult],
      searchResults: transformedSearchResults,
      citations: citations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 検索結果をSearchResult形式に変換
   */
  private transformSearchResults(
    searchResults: PerplexitySearchResult[],
    query: string,
  ): SearchResult[] {
    return searchResults.map((result, index) => ({
      id: `search-${index + 1}`,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      relevanceScore: this.calculateRelevanceScore(result, query),
      lastUpdated: result.date
        ? new Date(result.date).toISOString()
        : undefined,
    }));
  }

  /**
   * ResearchResultを作成
   */
  private createResearchResult(
    context: ResearchContext,
    content: string,
    citations: string[],
    searchResults: PerplexitySearchResult[],
  ): ResearchResult {
    return {
      id: context.researchId || `research-${Date.now()}`,
      content: content,
      source: "perplexity",
      relevanceScore: 1.0,
      processedCitations: citations.map((url, index) => ({
        id: `citation-${index + 1}`,
        number: index + 1,
        url,
        title: this.findTitleForUrl(url, searchResults),
        domain: this.extractDomain(url),
      })),
    };
  }

  /**
   * 関連度スコアを計算（ドメインルール）
   */
  calculateRelevanceScore(
    result: PerplexitySearchResult,
    query: string,
  ): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const resultText = `${result.title} ${result.snippet}`.toLowerCase();

    const matches = queryWords.filter((word) => resultText.includes(word));
    return matches.length / queryWords.length;
  }

  /**
   * URLに対応するタイトルを検索
   */
  findTitleForUrl(
    url: string,
    searchResults: PerplexitySearchResult[],
  ): string | undefined {
    return searchResults.find((result) => result.url === url)?.title;
  }

  /**
   * URLからドメインを抽出
   */
  extractDomain(url?: string): string | undefined {
    if (!url) return undefined;
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}
