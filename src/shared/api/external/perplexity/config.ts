/**
 * Perplexity API 設定・定数の一元管理
 *
 * 全ての定数、設定値、プロンプトテンプレートを統合管理し、
 * 各モジュールでの重複を排除する
 */

/**
 * Perplexity API のデフォルト設定
 */
const DEFAULT_API_CONFIG = {
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
 * リサーチサービスの定数
 */
const RESEARCH_CONSTANTS = {
  SOURCE_NAME: "Perplexity AI",
  MIN_RELEVANCE_SCORE: 0.1,
  MAX_RELEVANCE_SCORE: 1.0,
  ID_PREFIX: "research",
  ID_RANDOM_LENGTH: 9,
} as const;

/**
 * エラーメッセージ定数
 */
const ERROR_MESSAGES = {
  API_KEY_REQUIRED: "Perplexity API key is required",
  QUERY_REQUIRED: "Research query is required",
  INVALID_RESPONSE: "Invalid response format",
  EMPTY_RESPONSE: "Empty response received",
  UNKNOWN_ERROR: "Unknown error occurred",
} as const;

/**
 * パフォーマンス設定
 */
const PERFORMANCE_CONFIG = {
  RELEVANCE_CALCULATION: {
    EXACT_MATCH_WEIGHT: 1.0,
    PARTIAL_MATCH_WEIGHT: 0.5,
    MIN_WORD_LENGTH: 2,
  },
  CACHING: {
    PROMPT_TEMPLATE_CACHE_SIZE: 100,
    CONFIG_MERGE_CACHE_SIZE: 50,
  },
} as const;

/**
 * Perplexity API設定の一元管理クラス
 */
export class PerplexityConfig {
  static readonly DEFAULT_API_CONFIG = DEFAULT_API_CONFIG;
  static readonly ENDPOINTS = ENDPOINTS;
  static readonly PROMPT_TEMPLATES = PROMPT_TEMPLATES;
  static readonly VOICE_COMMAND_INSTRUCTIONS = VOICE_COMMAND_INSTRUCTIONS;
  static readonly RESEARCH_CONSTANTS = RESEARCH_CONSTANTS;
  static readonly ERROR_MESSAGES = ERROR_MESSAGES;
  static readonly PERFORMANCE_CONFIG = PERFORMANCE_CONFIG;

  /**
   * 音声コマンドに対応する指示を取得
   */
  static getVoiceCommandInstruction(voiceCommand?: string): string {
    if (!voiceCommand) return "";

    return (
      VOICE_COMMAND_INSTRUCTIONS[
        voiceCommand as keyof typeof VOICE_COMMAND_INSTRUCTIONS
      ] || ""
    );
  }

  /**
   * システムプロンプトテンプレートを構築
   */
  static buildSystemPrompt(
    selectedText?: string,
    voiceCommand?: string,
  ): string {
    const parts: string[] = [PROMPT_TEMPLATES.SYSTEM_BASE];

    if (selectedText?.trim()) {
      const selectedTextPrompt = PROMPT_TEMPLATES.SYSTEM_SELECTED_TEXT.replace(
        "{{selectedText}}",
        selectedText,
      );
      parts.push(selectedTextPrompt);
    }

    const voiceInstruction = this.getVoiceCommandInstruction(voiceCommand);
    if (voiceInstruction) {
      parts.push(voiceInstruction);
    }

    parts.push(PROMPT_TEMPLATES.SYSTEM_CLOSING);
    return parts.join("");
  }

  /**
   * デフォルト設定と指定設定をマージ
   */
  static mergeConfig<T extends Record<string, unknown>>(
    defaultConfig: T,
    userConfig: Partial<T>,
  ): Required<T> {
    return {
      ...defaultConfig,
      ...userConfig,
    } as Required<T>;
  }

  /**
   * 有効な音声コマンドかどうかを判定
   */
  static isValidVoiceCommand(voiceCommand: string): boolean {
    return voiceCommand in VOICE_COMMAND_INSTRUCTIONS;
  }

  /**
   * スコア値を有効範囲にクランプ
   */
  static clampRelevanceScore(score: number): number {
    return Math.min(
      Math.max(score, RESEARCH_CONSTANTS.MIN_RELEVANCE_SCORE),
      RESEARCH_CONSTANTS.MAX_RELEVANCE_SCORE,
    );
  }
}

/**
 * 型安全な設定値を提供するヘルパー型
 */
export type VoiceCommandType = keyof typeof VOICE_COMMAND_INSTRUCTIONS;
