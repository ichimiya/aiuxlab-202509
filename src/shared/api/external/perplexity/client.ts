import type {
  PerplexityConfig,
  PerplexityRequest,
  PerplexityResponse,
  ResearchContext,
  PerplexityMessage,
} from "./types";
import { ErrorHandler } from "./errorHandler";
import { PerplexityConfig as Config } from "./config";
import { ValidationUtils } from "./utils";
import { TypeGuards } from "./typeGuards";

/**
 * Perplexity API クライアント
 */
export class PerplexityClient {
  private readonly config: Required<PerplexityConfig>;

  constructor(config: PerplexityConfig) {
    if (!ValidationUtils.validateApiKey(config.apiKey)) {
      throw new Error(Config.ERROR_MESSAGES.API_KEY_REQUIRED);
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || Config.DEFAULT_API_CONFIG.BASE_URL,
      model: config.model || Config.DEFAULT_API_CONFIG.MODEL,
      timeout: config.timeout || Config.DEFAULT_API_CONFIG.TIMEOUT,
    };
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

    const request = this.buildRequest(context);

    try {
      const response = await this.makeApiCall(request);
      return await this.handleResponse(response);
    } catch (error) {
      throw ErrorHandler.handleError(error);
    }
  }

  /**
   * リクエストオブジェクトを構築
   */
  private buildRequest(context: ResearchContext): PerplexityRequest {
    return {
      model: this.config.model,
      messages: this.buildPrompt(context),
      max_tokens: Config.DEFAULT_API_CONFIG.MAX_TOKENS,
      temperature: Config.DEFAULT_API_CONFIG.TEMPERATURE,
      return_citations: true,
      return_related_questions: true,
    };
  }

  /**
   * API呼び出しを実行
   */
  private async makeApiCall(request: PerplexityRequest): Promise<Response> {
    const url = `${this.config.baseUrl}${Config.ENDPOINTS.CHAT_COMPLETIONS}`;

    // タイムアウト処理（AbortControllerを使用）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * HTTPヘッダーを構築
   */
  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * APIレスポンスを処理
   */
  private async handleResponse(
    response: Response,
  ): Promise<PerplexityResponse> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => undefined);
      throw ErrorHandler.handleHttpError(response, errorData);
    }

    const responseData = await response.json();

    // 基本的な型チェック
    if (!responseData || typeof responseData !== "object") {
      throw ErrorHandler.handleResponseFormatError();
    }

    // 必要な構造チェック（choices が存在するかのみチェック）
    const response_obj = responseData as { choices?: unknown[] };
    if (!response_obj.choices || !Array.isArray(response_obj.choices)) {
      throw ErrorHandler.handleResponseFormatError();
    }

    // 空レスポンスチェック
    if (response_obj.choices.length === 0) {
      throw ErrorHandler.handleEmptyResponseError();
    }

    // 完全な型チェック
    if (!TypeGuards.isPerplexityResponse(responseData)) {
      throw ErrorHandler.handleResponseFormatError();
    }

    return responseData;
  }

  /**
   * リサーチコンテキストからプロンプトメッセージを構築
   */
  private buildPrompt(context: ResearchContext): PerplexityMessage[] {
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
