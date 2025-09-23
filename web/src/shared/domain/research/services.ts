/**
 * Research Domain Services
 * ビジネスルールとドメインロジック（ドメイン層）
 */

import DOMPurify from "dompurify";
import { marked } from "marked";
import type {
  Research,
  ResearchResult,
  SearchResult,
} from "../../api/generated/models";
import type {
  PerplexityResponse,
  PerplexitySearchResult,
  ResearchContext,
} from "../../infrastructure/external/search/types";
import type { ContentProcessingPort } from "../../useCases/ports/contentProcessing";

type JSDOMConstructor = typeof import("jsdom").JSDOM;

let purify: typeof DOMPurify;
let NodeJSDOM: JSDOMConstructor | null = null;
let nodeRandomUUID: (() => string) | null = null;

if (typeof window !== "undefined") {
  purify = DOMPurify;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require("jsdom");
  NodeJSDOM = JSDOM;
  const window = new JSDOM("").window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  purify = DOMPurify(window as any);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomUUID } = require("crypto") as {
      randomUUID?: () => string;
    };
    if (typeof randomUUID === "function") {
      nodeRandomUUID = randomUUID;
    }
  } catch {
    nodeRandomUUID = null;
  }
}

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
  constructor(private readonly contentPort?: ContentProcessingPort) {}
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
      htmlContent: "",
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
    if (!this.contentPort || !research.results) {
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
            htmlContent: processedContent.htmlContent,
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
    if (!this.contentPort) {
      // フォールバック処理
      return this.fallbackProcessing(markdownContent, citations, searchResults);
    }

    try {
      // 1. Port経由で処理（構造化出力）
      const output = await this.contentPort.process({
        markdown: markdownContent,
        citations,
        searchResults,
      });

      const htmlCandidate = extractHtmlContentCandidate(output.htmlContent);

      if (!htmlCandidate) {
        const fallback = this.fallbackProcessing(
          markdownContent,
          citations,
          searchResults,
        );

        return {
          htmlContent: fallback.htmlContent,
          processedCitations:
            output.processedCitations && output.processedCitations.length > 0
              ? output.processedCitations
              : fallback.processedCitations,
        };
      }

      // 2. HTMLをサニタイズ（セマンティック要素を許可）
      const sanitizedHtml = purify.sanitize(htmlCandidate, SANITIZE_OPTIONS);
      const normalizedHtml = normalizeHtmlAttributes(sanitizedHtml);

      return {
        htmlContent: ensureElementIds(normalizedHtml),
        processedCitations: output.processedCitations,
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
    // 1) Markdown -> HTML（marked）
    const htmlContentRaw = marked.parse(markdownContent) as string;
    let htmlContent = htmlContentRaw;

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

    // 2) 引用番号をリンクに置換
    htmlContent = htmlContent.replace(/\[(\d+)\]/g, (match, number) => {
      const citation = processedCitations.find(
        (c) => c.number === parseInt(number),
      );
      if (!citation) return match;

      return `<a href="#${citation.id}">${match}</a>`;
    });

    // 3) サニタイズ（LLM経路と同等の許可リスト）
    const sanitizedHtml = purify.sanitize(htmlContent, SANITIZE_OPTIONS);
    const normalizedHtml = normalizeHtmlAttributes(sanitizedHtml);

    return {
      htmlContent: ensureElementIds(normalizedHtml),
      processedCitations,
    };
  }
}

// 共有のサニタイズ設定
const SANITIZE_OPTIONS = {
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
};

function extractHtmlContentCandidate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const codeBlockMatch = trimmed.match(JSON_CODE_BLOCK_REGEX);
  if (codeBlockMatch) {
    const parsedFromCodeBlock = parseHtmlContentFromJson(codeBlockMatch[1]);
    if (parsedFromCodeBlock) {
      return parsedFromCodeBlock;
    }
  }

  const parsed = parseHtmlContentFromJson(trimmed);
  if (parsed) {
    return parsed;
  }

  if (trimmed.startsWith("<")) {
    return trimmed;
  }

  return null;
}

function parseHtmlContentFromJson(payload: string): string | null {
  try {
    const parsed = JSON.parse(payload) as { htmlContent?: unknown } | null;
    if (parsed && typeof parsed.htmlContent === "string") {
      const html = parsed.htmlContent.trim();
      if (html) {
        return html;
      }
    }
  } catch {
    const looseHtml = extractHtmlContentFromLooseJson(payload);
    if (looseHtml) {
      return looseHtml;
    }
  }

  return null;
}

function extractHtmlContentFromLooseJson(value: string): string | null {
  const match = value.match(HTML_CONTENT_VALUE_REGEX);
  if (!match) {
    return null;
  }

  const unescaped = unescapeJsonString(match[1]);

  return unescaped.trim() ? unescaped : null;
}

function unescapeJsonString(value: string): string {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\f/g, "\f")
    .replace(/\\b/g, "\b")
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"')
    .replace(/\\&/g, "&");
}

function normalizeHtmlAttributes(value: string): string {
  return value.replace(
    /(href|src)=("|')&quot;([^"']+)&quot;\2/gi,
    (_match: string, attr: string, quote: string, url: string) =>
      `${attr}=${quote}${url}${quote}`,
  );
}

const JSON_CODE_BLOCK_REGEX = /```json\s*([\s\S]*?)\s*```/i;
const HTML_CONTENT_VALUE_REGEX = /"htmlContent"\s*:\s*"((?:\\.|[^"\\])*)"/i;

function ensureElementIds(value: string): string {
  if (!value.trim()) {
    return value;
  }

  let document: Document | null = null;

  if (typeof window !== "undefined" && window.document?.implementation) {
    const doc = window.document.implementation.createHTMLDocument("");
    doc.body.innerHTML = value;
    document = doc;
  } else if (NodeJSDOM) {
    const dom = new NodeJSDOM(`<body>${value}</body>`);
    document = dom.window.document;
  }

  if (!document) {
    return value;
  }

  const usedIds = new Set<string>();
  document.querySelectorAll("[id]").forEach((element) => {
    const id = element.getAttribute("id");
    if (id) {
      usedIds.add(id);
    }
  });

  document.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (element.id) {
      return;
    }
    const newId = createUniqueId(usedIds);
    element.id = newId;
    usedIds.add(newId);
  });

  return document.body.innerHTML;
}

function createUniqueId(usedIds: Set<string>): string {
  let candidate: string;
  do {
    candidate = generateUuid();
  } while (usedIds.has(candidate));
  return candidate;
}

function generateUuid(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  if (nodeRandomUUID) {
    return nodeRandomUUID();
  }

  return `uuid-${Math.random().toString(16).slice(2, 10)}-${Date.now().toString(16)}`;
}
