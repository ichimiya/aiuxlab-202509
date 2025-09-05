import type {
  PerplexityConfig,
  PerplexityRequest,
  PerplexityResponse,
  PerplexityError,
  ResearchContext,
  PerplexityMessage,
} from "./types";

/**
 * Perplexity API のデフォルト設定
 */
const DEFAULT_CONFIG = {
  BASE_URL: "https://api.perplexity.ai",
  MODEL: "llama-3.1-sonar-large-128k-online",
  TIMEOUT: 30000,
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.2,
} as const;

/**
 * API エンドポイント
 */
const ENDPOINTS = {
  CHAT_COMPLETIONS: "/chat/completions",
} as const;

/**
 * プロンプトテンプレート
 */
const PROMPT_TEMPLATES = {
  SYSTEM_BASE: "あなたは高度なAIリサーチアシスタントです。",
  SYSTEM_SELECTED_TEXT:
    '\n\n以下のテキストがユーザーによって選択されています：\n"{{selectedText}}"',
  SYSTEM_CLOSING: "\n\n最新の情報を含む、正確で詳細な回答を提供してください。",
} as const;

/**
 * 音声コマンド指示のマッピング
 */
const VOICE_COMMAND_INSTRUCTIONS = {
  deepdive: "\n\n詳細に掘り下げて分析し、深い洞察を提供してください。",
  perspective: "\n\n複数の視点から多角的に分析してください。",
  concrete: "\n\n具体的な事例や実例を交えて説明してください。",
  data: "\n\nデータや統計情報を重視して回答してください。",
  compare: "\n\n比較・対比を含めて分析してください。",
  trend: "\n\n最新のトレンドや動向に焦点を当ててください。",
  practical: "\n\n実用的で実践的な情報を提供してください。",
  summary: "\n\n要点を整理して簡潔にまとめてください。",
} as const;

/**
 * Perplexity API クライアント
 */
export class PerplexityClient {
  private readonly config: Required<PerplexityConfig>;

  constructor(config: PerplexityConfig) {
    if (!config.apiKey?.trim()) {
      throw new Error("Perplexity API key is required");
    }

    this.config = {
      baseUrl: DEFAULT_CONFIG.BASE_URL,
      model: DEFAULT_CONFIG.MODEL,
      timeout: DEFAULT_CONFIG.TIMEOUT,
      ...config,
    };
  }

  /**
   * リサーチクエリを実行
   */
  async search(context: ResearchContext): Promise<PerplexityResponse> {
    this.validateContext(context);

    const request = this.buildRequest(context);

    try {
      const response = await this.makeApiCall(request);
      return await this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * リクエストオブジェクトを構築
   */
  private buildRequest(context: ResearchContext): PerplexityRequest {
    return {
      model: this.config.model,
      messages: this.buildPrompt(context),
      max_tokens: DEFAULT_CONFIG.MAX_TOKENS,
      temperature: DEFAULT_CONFIG.TEMPERATURE,
      return_citations: true,
      return_related_questions: true,
    };
  }

  /**
   * API呼び出しを実行
   */
  private async makeApiCall(request: PerplexityRequest): Promise<Response> {
    const url = `${this.config.baseUrl}${ENDPOINTS.CHAT_COMPLETIONS}`;

    return fetch(url, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout),
    });
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
      const errorData: PerplexityError = await response.json().catch(() => ({
        error: {
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: "http_error",
        },
      }));
      throw new Error(errorData.error.message);
    }

    return await response.json();
  }

  /**
   * エラーハンドリング
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error("Unknown error occurred during API call");
  }

  /**
   * コンテキストバリデーション
   */
  private validateContext(context: ResearchContext): void {
    if (!context.query?.trim()) {
      throw new Error("Research query is required");
    }
  }

  /**
   * リサーチコンテキストからプロンプトメッセージを構築
   */
  private buildPrompt(context: ResearchContext): PerplexityMessage[] {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(context);

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  /**
   * システムプロンプトを構築
   */
  private buildSystemPrompt(context: ResearchContext): string {
    const parts: string[] = [PROMPT_TEMPLATES.SYSTEM_BASE];

    if (context.selectedText?.trim()) {
      const selectedTextPrompt = PROMPT_TEMPLATES.SYSTEM_SELECTED_TEXT.replace(
        "{{selectedText}}",
        context.selectedText,
      );
      parts.push(selectedTextPrompt);
    }

    if (context.voiceCommand) {
      const instruction = this.getVoiceCommandInstruction(context.voiceCommand);
      if (instruction) {
        parts.push(instruction);
      }
    }

    parts.push(PROMPT_TEMPLATES.SYSTEM_CLOSING);

    return parts.join("");
  }

  /**
   * ユーザープロンプトを構築
   */
  private buildUserPrompt(context: ResearchContext): string {
    return context.query.trim();
  }

  /**
   * 音声コマンドに応じた指示を生成
   */
  private getVoiceCommandInstruction(voiceCommand: string): string {
    return (
      VOICE_COMMAND_INSTRUCTIONS[
        voiceCommand as keyof typeof VOICE_COMMAND_INSTRUCTIONS
      ] || ""
    );
  }
}
