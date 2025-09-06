/**
 * Perplexity API Infrastructure Layer
 * 外部APIとの通信のみを担当（インフラストラクチャ層）
 */

import OpenAI from "openai";
import type { VoicePattern } from "../../../api/generated/models/voicePattern";

// ========================================
// 型定義
// ========================================

export interface PerplexityConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface ResearchContext {
  query: string;
  selectedText?: string;
  voiceCommand?: VoicePattern;
  researchId?: string;
}

export interface PerplexitySearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

export interface PerplexityResponse extends OpenAI.Chat.ChatCompletion {
  citations?: string[];
  search_results?: PerplexitySearchResult[];
  related_questions?: string[];
}

export class PerplexityAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PerplexityAPIError";
  }
}

// ========================================
// Repository Interface
// ========================================

export interface IResearchAPIRepository {
  search(context: ResearchContext): Promise<PerplexityResponse>;
}

// ========================================
// Infrastructure Implementation
// ========================================

export class PerplexityClient implements IResearchAPIRepository {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: PerplexityConfig) {
    if (!config.apiKey?.trim()) {
      throw new PerplexityAPIError("API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || "https://api.perplexity.ai",
    });

    this.model = config.model || "sonar";
  }

  /**
   * リサーチクエリを実行
   */
  async search(context: ResearchContext): Promise<PerplexityResponse> {
    if (!context.query?.trim()) {
      throw new PerplexityAPIError("Query is required");
    }

    try {
      const messages = this.buildPrompt(context);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 2000,
        temperature: 0.2,
        // Perplexity特有のパラメータ
        return_citations: true,
        return_related_questions: true,
        stream: false,
      } as OpenAI.Chat.ChatCompletionCreateParams & {
        return_citations: boolean;
        return_related_questions: boolean;
      });

      return response as PerplexityResponse;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new PerplexityAPIError(
          `Perplexity API error: ${error.message}`,
          error.code || undefined,
          error.status,
        );
      }
      throw new PerplexityAPIError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * プロンプト構築
   */
  private buildPrompt(
    context: ResearchContext,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const systemPrompt = `あなたは世界最高レベルのリサーチ専門家です。以下の原則に従って包括的なリサーチを実施してください：

【リサーチ原則】
1. 最新の情報を基に正確で信頼性の高い回答を提供
2. 複数の視点から多角的に分析
3. 具体的な事例やデータを含める
4. 重要なポイントは見出し付きで構造化
5. 関連する追加の調査観点を提案

【出力形式】
- 見出しを使った構造化された回答
- 重要な情報には適切な引用を含める
- 関連する質問や調査観点を提案`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // 選択テキストがある場合のコンテキスト追加
    if (context.selectedText) {
      messages.push({
        role: "user",
        content: `【選択されたテキスト】\n${context.selectedText}\n\n【リサーチクエリ】\n${context.query}`,
      });
    } else {
      messages.push({
        role: "user",
        content: context.query,
      });
    }

    return messages;
  }
}

// ========================================
// エクスポート
// ========================================

export { OpenAI };
export type PerplexityMessage = OpenAI.Chat.ChatCompletionMessageParam;
