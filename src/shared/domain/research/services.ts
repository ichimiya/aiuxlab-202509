/**
 * Research Domain Services
 * ビジネスルールとドメインロジック（ドメイン層）
 */

import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
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
import type { IContentProcessingRepository } from "../../infrastructure/external/bedrock";

// Node.js環境でDOMPurifyを使用するための設定
const window = new JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

// ========================================
// 型定義
// ========================================

export interface ProcessedContent {
  /** HTML化されたコンテンツ */
  htmlContent: string;
  /** 構造化された引用情報 */
  processedCitations: ProcessedCitation[];
}

export interface ProcessedCitation {
  /** 引用ID（ref1, ref2など） */
  id: string;
  /** 引用番号（1, 2など） */
  number: number;
  /** 引用URL */
  url: string;
  /** 引用タイトル（検索結果から取得） */
  title?: string;
  /** 引用ドメイン */
  domain?: string;
}

// ========================================
// Domain Services
// ========================================

export class ResearchDomainService {
  constructor(
    private readonly contentRepository?: IContentProcessingRepository,
  ) {}
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

  /**
   * リサーチ結果のコンテンツを処理してHTML化する
   */
  async enhanceResearchWithProcessedContent(
    research: Research,
  ): Promise<Research> {
    if (!this.contentRepository || !research.results) {
      return research;
    }

    try {
      const enhancedResults = await Promise.all(
        research.results.map(async (result) => {
          const processedContent = await this.processContent(
            result.content,
            research.citations || [],
            research.searchResults || [],
          );

          return {
            ...result,
            content: processedContent.htmlContent,
            processedCitations: processedContent.processedCitations,
          };
        }),
      );

      return {
        ...research,
        results: enhancedResults,
      };
    } catch (error) {
      console.error("Content processing failed:", error);
      // エラー時は元のリサーチ結果を返す
      return research;
    }
  }

  /**
   * コンテンツ処理（ドメインロジック）
   */
  async processContent(
    markdownContent: string,
    citations: string[] = [],
    searchResults: Array<{ title: string; url: string }> = [],
  ): Promise<ProcessedContent> {
    if (!this.contentRepository) {
      // フォールバック処理
      return this.fallbackProcessing(markdownContent, citations, searchResults);
    }

    try {
      // 1. Infrastructure層でLLM処理を実行
      const llmResponse = await this.contentRepository.processContent({
        markdownContent,
        citations,
        searchResults,
      });

      // 2. Domain層でレスポンスをパース・サニタイズ
      const parsedResponse = this.parseLLMResponse(llmResponse);

      // 3. HTMLをサニタイズ（セマンティック要素を許可）
      const sanitizedHtml = purify.sanitize(parsedResponse.htmlContent, {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "ul",
          "ol",
          "li",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "a",
          "span",
          "div",
          "blockquote",
          "code",
          "pre",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "cite",
          "section",
          "article",
          "header",
          "main",
          "aside",
          "footer",
        ],
        ALLOWED_ATTR: ["href", "id", "target", "rel"],
      });

      return {
        htmlContent: sanitizedHtml,
        processedCitations: parsedResponse.processedCitations,
      };
    } catch (error) {
      console.error("Content processing error:", error);
      // フォールバック処理
      return this.fallbackProcessing(markdownContent, citations, searchResults);
    }
  }

  /**
   * LLM応答をパース（ドメインロジック）
   */
  private parseLLMResponse(llmResponse: string): {
    htmlContent: string;
    processedCitations: ProcessedCitation[];
  } {
    try {
      // JSON部分を抽出（LLMが余計なテキストを含む場合があるため）
      let jsonMatch = llmResponse.match(/\{[\s\S]*\}/);

      // JSONブロックを探す（```json で囲まれている場合）
      if (!jsonMatch) {
        const codeBlockMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]];
        }
      }

      // 単純にJSONっぽい部分を探す
      if (!jsonMatch) {
        const simpleJsonMatch = llmResponse.match(
          /(\{[\s\S]*"htmlContent"[\s\S]*\})/,
        );
        if (simpleJsonMatch) {
          jsonMatch = [simpleJsonMatch[1]];
        }
      }

      if (!jsonMatch) {
        throw new Error("No JSON found in LLM response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        htmlContent: parsed.htmlContent || "",
        processedCitations: (parsed.processedCitations || []).map(
          (citation: unknown) => {
            const citationObj = citation as Record<string, unknown>;
            return {
              id: (citationObj.id as string) || `ref${citationObj.number}`,
              number: (citationObj.number as number) || 0,
              url: (citationObj.url as string) || "#",
              title: citationObj.title as string,
              domain:
                (citationObj.domain as string) ||
                this.extractDomain(citationObj.url as string),
            };
          },
        ),
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      throw new Error("Failed to parse LLM response");
    }
  }

  /**
   * フォールバック処理（LLM呼び出しが失敗した場合）
   */
  private fallbackProcessing(
    markdownContent: string,
    citations: string[],
    searchResults: Array<{ title: string; url: string }>,
  ): ProcessedContent {
    // 基本的なMarkdown→HTML変換
    let htmlContent = markdownContent
      .replace(/### (.*?)$/gm, "<h3>$1</h3>")
      .replace(/## (.*?)$/gm, "<h2>$1</h2>")
      .replace(/# (.*?)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^\s*-\s+(.*?)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>");

    htmlContent = `<p>${htmlContent}</p>`;

    // 引用番号の処理
    const citationPattern = /\[(\d+)\]/g;
    const foundCitations = new Set<number>();
    let match;

    while ((match = citationPattern.exec(markdownContent)) !== null) {
      foundCitations.add(parseInt(match[1]));
    }

    const processedCitations = Array.from(foundCitations).map((number) => {
      const citationUrl = citations[number - 1];
      const searchResult = searchResults.find(
        (result) => result.url === citationUrl,
      );

      return {
        id: `ref${number}`,
        number,
        url: citationUrl || "#",
        title: searchResult?.title,
        domain: citationUrl ? this.extractDomain(citationUrl) : undefined,
      };
    });

    // 引用番号をリンクに置換
    htmlContent = htmlContent.replace(/\[(\d+)\]/g, (match, number) => {
      const citation = processedCitations.find(
        (c) => c.number === parseInt(number),
      );
      if (!citation) return match;

      return `<a href="#${citation.id}">${match}</a>`;
    });

    return {
      htmlContent,
      processedCitations,
    };
  }
}
