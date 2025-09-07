/**
 * Bedrock API Infrastructure - Content Processing
 */
import { BaseBedrockClient, jsonSchema } from "../common";

export interface BedrockConfig {
  region?: string;
  modelId?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface ContentProcessingRequest {
  markdownContent: string;
  citations: string[];
  searchResults: Array<{ title: string; url: string }>;
}

export interface BedrockResponse {
  content: Array<{
    text: string;
  }>;
}

export class BedrockAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "BedrockAPIError";
  }
}

export interface IContentProcessingRepository {
  processContent(request: ContentProcessingRequest): Promise<string>;
}

export class BedrockContentProcessingClient
  extends BaseBedrockClient
  implements IContentProcessingRepository
{
  async processContent(request: ContentProcessingRequest): Promise<string> {
    if (!request.markdownContent?.trim()) {
      throw new BedrockAPIError("Markdown content is required");
    }

    try {
      const prompt = this.buildPrompt(request);
      const text = await this.invokePrompt(prompt);
      return text;
    } catch (error) {
      if (error instanceof Error) {
        throw new BedrockAPIError(`Bedrock API error: ${error.message}`);
      }
      throw new BedrockAPIError("Network error: Unknown error");
    }
  }

  private buildPrompt(request: ContentProcessingRequest): string {
    const schema = [
      '  "htmlContent": string,',
      '  "processedCitations": Array<{ id: string; number: number; url: string; title?: string; domain?: string }>',
    ];
    return [
      "あなたは、セマンティックHTMLの専門家です。以下のMarkdownテキストを、意味的に適切な階層構造を持つHTMLに変換してください。",
      "",
      "【セマンティック変換ルール】",
      "1. 見出し階層を正しく設定（h1, h2, h3で文書構造を表現）",
      "2. セクション構造を<section>や<article>で適切にグループ化",
      "3. リスト項目は<ul>, <ol>, <li>で適切に構造化",
      "4. 重要な内容は<strong>, <em>で意味づけ",
      "5. 引用や参考情報は<blockquote>や<cite>を使用",
      '6. [1][2]などの引用番号は <a href="#ref1">[1]</a> のようにリンク化（classは不要）',
      "7. コードは<code>や<pre>で適切にマークアップ",
      "",
      "【引用情報の処理】",
      `Citations: ${JSON.stringify(request.citations)}`,
      `SearchResults: ${JSON.stringify(request.searchResults)}`,
      "引用番号[1][2]等に対応する情報を上記から抽出し、processedCitationsを生成してください。",
      "",
      "【入力Markdown】",
      request.markdownContent,
      "",
      jsonSchema(schema),
    ].join("\n");
  }
}

// 互換エイリアス（旧名）
// 互換エイリアスは現在は提供しない（明確な命名に統一）
