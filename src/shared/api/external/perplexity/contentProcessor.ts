/**
 * Perplexityのコンテンツ処理サービス
 * Markdownを構造化されたHTMLに変換し、引用との関連付けを行う
 */

import { marked } from "marked";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Node.js環境でDOMPurifyを使用するための設定
const window = new JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

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

export class ContentProcessor {
  /**
   * Markdownコンテンツを処理して構造化されたHTMLと引用情報を生成
   */
  static processContent(
    markdownContent: string,
    citations: string[] = [],
    searchResults: Array<{ title: string; url: string }> = [],
  ): ProcessedContent {
    // 1. Markdownを基本HTMLに変換
    let htmlContent = marked.parse(markdownContent) as string;

    // 2. 引用番号パターンを抽出
    const citationPattern = /\[(\d+)\]/g;
    const foundCitations = new Set<number>();
    let match;

    while ((match = citationPattern.exec(markdownContent)) !== null) {
      foundCitations.add(parseInt(match[1]));
    }

    // 3. 構造化された引用情報を生成
    const processedCitations = this.createProcessedCitations(
      Array.from(foundCitations),
      citations,
      searchResults,
    );

    // 4. 引用番号をリンクに置換
    htmlContent = this.replaceCitationLinks(htmlContent, processedCitations);

    // 5. HTMLをサニタイズ
    htmlContent = purify.sanitize(htmlContent, {
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
      ],
      ALLOWED_ATTR: ["href", "id", "class", "target", "rel"],
    });

    return {
      htmlContent,
      processedCitations,
    };
  }

  /**
   * 構造化された引用情報を生成
   */
  private static createProcessedCitations(
    citationNumbers: number[],
    citations: string[],
    searchResults: Array<{ title: string; url: string }>,
  ): ProcessedCitation[] {
    return citationNumbers.map((number) => {
      const citationUrl = citations[number - 1]; // 配列は0ベースなので-1
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
  }

  /**
   * 引用番号をクリック可能なリンクに置換
   */
  private static replaceCitationLinks(
    htmlContent: string,
    processedCitations: ProcessedCitation[],
  ): string {
    const citationMap = new Map(
      processedCitations.map((citation) => [citation.number, citation]),
    );

    return htmlContent.replace(/\[(\d+)\]/g, (match, number) => {
      const citation = citationMap.get(parseInt(number));
      if (!citation) return match;

      return `<a href="#${citation.id}" class="citation-link text-blue-600 hover:text-blue-800 font-medium" data-citation-id="${citation.id}">${match}</a>`;
    });
  }

  /**
   * URLからドメイン名を抽出
   */
  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  /**
   * 引用セクション用のHTMLを生成
   */
  static generateCitationsHTML(
    processedCitations: ProcessedCitation[],
  ): string {
    if (processedCitations.length === 0) return "";

    const citationsHTML = processedCitations
      .map((citation) => {
        const title = citation.title || citation.domain || citation.url;
        return `
          <div id="${citation.id}" class="citation-item mb-3 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-start gap-3">
              <span class="citation-number bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono flex-shrink-0">
                [${citation.number}]
              </span>
              <div class="min-w-0 flex-1">
                <a href="${citation.url}" target="_blank" rel="noopener noreferrer" 
                   class="text-blue-600 hover:text-blue-800 hover:underline font-medium block">
                  ${title}
                </a>
                ${citation.domain ? `<p class="text-sm text-gray-600 mt-1">${citation.domain}</p>` : ""}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="citations-section">
        <h4 class="text-md font-medium text-gray-900 mb-3">引用・参考文献</h4>
        <div class="citations-list">
          ${citationsHTML}
        </div>
      </div>
    `;
  }
}
