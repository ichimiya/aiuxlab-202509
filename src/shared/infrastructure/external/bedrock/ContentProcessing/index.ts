/**
 * Bedrock API Infrastructure - Content Processing
 */
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

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
  implements IContentProcessingRepository
{
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor(config: BedrockConfig = {}) {
    this.client = new BedrockRuntimeClient({
      region: config.region || process.env.AWS_REGION || "us-east-1",
      credentials: config.credentials || {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    this.modelId =
      config.modelId ||
      process.env.BEDROCK_MODEL_ID ||
      "anthropic.claude-3-haiku-20240307-v1:0";
  }

  async processContent(request: ContentProcessingRequest): Promise<string> {
    if (!request.markdownContent?.trim()) {
      throw new BedrockAPIError("Markdown content is required");
    }

    try {
      const prompt = this.buildPrompt(request);

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
      const responseData = JSON.parse(
        new TextDecoder().decode(response.body),
      ) as BedrockResponse;

      return responseData.content[0].text;
    } catch (error) {
      if (error instanceof Error) {
        throw new BedrockAPIError(`Bedrock API error: ${error.message}`);
      }
      throw new BedrockAPIError("Network error: Unknown error");
    }
  }

  private buildPrompt(request: ContentProcessingRequest): string {
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
${JSON.stringify(request.citations)}
${JSON.stringify(request.searchResults)}

引用番号[1][2]等に対応する情報を上記から抽出し、processedCitationsを生成してください。

【入力Markdown】
${request.markdownContent}

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
}

// 互換エイリアス（旧名）
// 互換エイリアスは現在は提供しない（明確な命名に統一）
