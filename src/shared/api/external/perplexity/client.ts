import OpenAI from "openai";
import type {
  PerplexityConfig,
  ResearchContext,
  PerplexityResponse,
} from "./types";
import { ErrorHandler } from "./errorHandler";
import { PerplexityConfig as Config } from "./config";
import { ValidationUtils } from "./utils";

/**
 * Perplexity API クライアント
 */
export class PerplexityClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: PerplexityConfig) {
    if (!ValidationUtils.validateApiKey(config.apiKey)) {
      throw new Error(Config.ERROR_MESSAGES.API_KEY_REQUIRED);
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || Config.DEFAULT_API_CONFIG.BASE_URL,
    });

    this.model = config.model || Config.DEFAULT_API_CONFIG.MODEL;
  }

  /**
   * リサーチクエリを実行
   */
  async search(context: ResearchContext): Promise<PerplexityResponse> {
    if (!ValidationUtils.validateQuery(context.query)) {
      throw ErrorHandler.handleValidationError(
        Config.ERROR_MESSAGES.QUERY_REQUIRED,
      );
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: this.buildPrompt(context),
        max_tokens: Config.DEFAULT_API_CONFIG.MAX_TOKENS,
        temperature: Config.DEFAULT_API_CONFIG.TEMPERATURE,
        // Perplexity特有のパラメータ（OpenAI SDK型定義外）
        return_citations: true,
        return_related_questions: true,
        stream: false, // ストリーミングを無効にしてChatCompletion型を確実に取得
      } as OpenAI.Chat.ChatCompletionCreateParams & {
        return_citations?: boolean;
        return_related_questions?: boolean;
        stream: false;
      });

      return response as PerplexityResponse;
    } catch (error) {
      throw ErrorHandler.handleError(error);
    }
  }

  /**
   * リサーチコンテキストからプロンプトメッセージを構築
   */
  private buildPrompt(
    context: ResearchContext,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const systemPrompt = Config.buildSystemPrompt(
      context.selectedText,
      context.voiceCommand,
    );
    const userPrompt = context.query.trim();

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }
}
