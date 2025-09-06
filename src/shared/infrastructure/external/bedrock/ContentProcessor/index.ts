/**
 * Bedrockベースのコンテンツ処理サービス
 * LLMを使用してMarkdownを高品質なHTMLに変換し、引用との関連付けを行う
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
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

export interface BedrockContentProcessorConfig {
  /** AWS Bedrock リージョン */
  region?: string;
  /** 使用するモデル */
  modelId?: string;
  /** API認証情報 */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class BedrockContentProcessor {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(config: BedrockContentProcessorConfig = {}) {
    this.client = new BedrockRuntimeClient({
      region: config.region || process.env.AWS_REGION || "us-east-1",
      credentials: config.credentials || {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    // より確実に利用可能なモデルを使用
    this.modelId =
      config.modelId ||
      process.env.BEDROCK_MODEL_ID ||
      "anthropic.claude-3-haiku-20240307-v1:0";
  }

  /**
   * Markdownコンテンツを処理して構造化されたHTMLと引用情報を生成
   */
  async processContent(
    markdownContent: string,
    citations: string[] = [],
    searchResults: Array<{ title: string; url: string }> = [],
  ): Promise<ProcessedContent> {
    try {
      // 1. Bedrockを使用してMarkdownをHTMLに変換
      const llmResponse = await this.callBedrockForHtmlConversion(
        markdownContent,
        citations,
        searchResults,
      );

      // 2. LLM応答をパース
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
      console.error("BedrockContentProcessor error:", error);
      // フォールバック: 基本的な変換
      return this.fallbackProcessing(markdownContent, citations, searchResults);
    }
  }

  /**
   * BedrockでMarkdown→HTML変換を実行
   */
  private async callBedrockForHtmlConversion(
    markdownContent: string,
    citations: string[],
    searchResults: Array<{ title: string; url: string }>,
  ): Promise<string> {
    const prompt = this.buildConversionPrompt(
      markdownContent,
      citations,
      searchResults,
    );

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const response = await this.client.send(command);
    const responseData = JSON.parse(new TextDecoder().decode(response.body));
    return responseData.content[0].text;
  }

  /**
   * Markdown→HTML変換用のプロンプトを構築
   */
  private buildConversionPrompt(
    markdownContent: string,
    citations: string[],
    searchResults: Array<{ title: string; url: string }>,
  ): string {
    return `あなたは、セマンティックHTMLの専門家です。以下のMarkdownテキストを、意味的に適切な階層構造を持つHTMLに変換してください。

【セマンティック変換ルール】
1. 見出し階層を正しく設定（h1, h2, h3で文書構造を表現）
2. セクション構造を<section>や<article>で適切にグループ化
3. リスト項目は<ul>, <ol>, <li>で適切に構造化
4. 重要な内容は<strong>, <em>で意味づけ
5. 引用や参考情報は<blockquote>や<cite>を使用
6. [1][2]などの引用番号は <a href="#ref1">[1]</a> のようにリンク化（classは不要）
7. コードは<code>や<pre>で適切にマークアップ

【引用情報の処理】
Citations: ${JSON.stringify(citations)}
SearchResults: ${JSON.stringify(searchResults)}

引用番号[1][2]等に対応する情報を上記から抽出し、processedCitationsを生成してください。

【入力Markdown】
${markdownContent}

以下のJSON形式のみで返答してください：

{
  "htmlContent": "セマンティックHTML文字列（可読性のため適度に改行を含む）",
  "processedCitations": [
    {
      "id": "ref1",
      "number": 1,
      "url": "引用URL",
      "title": "検索結果から取得したタイトル",
      "domain": "ドメイン名"
    }
  ]
}`;
  }

  /**
   * LLM応答をパース
   */
  private parseLLMResponse(llmResponse: string): {
    htmlContent: string;
    processedCitations: ProcessedCitation[];
  } {
    try {
      console.log("Raw LLM Response:", llmResponse.substring(0, 500) + "...");

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
        console.warn("No JSON found in LLM response, using fallback");
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
      console.log("LLM Response that failed to parse:", llmResponse);
      throw new Error("Failed to parse LLM response");
    }
  }

  /**
   * フォールバック処理（Bedrock呼び出しが失敗した場合）
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

  /**
   * URLからドメイン名を抽出
   */
  private extractDomain(url?: string): string | undefined {
    if (!url) return undefined;
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}
