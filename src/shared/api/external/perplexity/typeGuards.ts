/**
 * 型安全性向上のための型ガードとバリデーター
 *
 * ランタイムでの型チェック、厳密なバリデーション、
 * 型安全な変換機能を提供
 */

import type {
  PerplexityResponse,
  PerplexityRequest,
  ResearchContext,
  PerplexityMessage,
  PerplexityChoice,
  PerplexityUsage,
} from "./types";
import { PerplexityConfig } from "./config";

/**
 * 型ガードコレクション
 */
export class TypeGuards {
  /**
   * PerplexityResponse型ガード
   */
  static isPerplexityResponse(value: unknown): value is PerplexityResponse {
    if (!value || typeof value !== "object") return false;

    const obj = value as Record<string, unknown>;

    // 必須フィールドの存在チェック
    if (
      typeof obj.id !== "string" ||
      obj.object !== "chat.completion" ||
      typeof obj.created !== "number" ||
      typeof obj.model !== "string" ||
      !Array.isArray(obj.choices) ||
      !obj.usage ||
      typeof obj.usage !== "object"
    ) {
      return false;
    }

    // choices配列の詳細チェック
    const choices = obj.choices as unknown[];
    if (choices.length === 0) return false;

    return choices.every((choice) => this.isPerplexityChoice(choice));
  }

  /**
   * PerplexityChoice型ガード
   */
  static isPerplexityChoice(value: unknown): value is PerplexityChoice {
    if (!value || typeof value !== "object") return false;

    const obj = value as Record<string, unknown>;

    return (
      typeof obj.index === "number" &&
      this.isPerplexityMessage(obj.message) &&
      (obj.finish_reason === "stop" ||
        obj.finish_reason === "length" ||
        obj.finish_reason === "content_filter" ||
        obj.finish_reason === null)
    );
  }

  /**
   * PerplexityMessage型ガード
   */
  static isPerplexityMessage(value: unknown): value is PerplexityMessage {
    if (!value || typeof value !== "object") return false;

    const obj = value as Record<string, unknown>;

    return (
      (obj.role === "system" ||
        obj.role === "user" ||
        obj.role === "assistant") &&
      typeof obj.content === "string"
    );
  }

  /**
   * PerplexityUsage型ガード
   */
  static isPerplexityUsage(value: unknown): value is PerplexityUsage {
    if (!value || typeof value !== "object") return false;

    const obj = value as Record<string, unknown>;

    return (
      typeof obj.prompt_tokens === "number" &&
      typeof obj.completion_tokens === "number" &&
      typeof obj.total_tokens === "number" &&
      obj.prompt_tokens >= 0 &&
      obj.completion_tokens >= 0 &&
      obj.total_tokens >= 0
    );
  }

  /**
   * ResearchContext型ガード
   */
  static isResearchContext(value: unknown): value is ResearchContext {
    if (!value || typeof value !== "object") return false;

    const obj = value as Record<string, unknown>;

    return (
      typeof obj.query === "string" &&
      obj.query.trim().length > 0 &&
      (obj.selectedText === undefined ||
        typeof obj.selectedText === "string") &&
      (obj.voiceCommand === undefined ||
        this.isValidVoiceCommand(obj.voiceCommand))
    );
  }

  /**
   * PerplexityRequest型ガード
   */
  static isPerplexityRequest(value: unknown): value is PerplexityRequest {
    if (!value || typeof value !== "object") return false;

    const obj = value as Record<string, unknown>;

    return (
      typeof obj.model === "string" &&
      obj.model.trim().length > 0 &&
      Array.isArray(obj.messages) &&
      obj.messages.length > 0 &&
      obj.messages.every((msg) => this.isPerplexityMessage(msg)) &&
      (obj.max_tokens === undefined || typeof obj.max_tokens === "number") &&
      (obj.temperature === undefined || typeof obj.temperature === "number")
    );
  }

  /**
   * 有効な音声コマンドかどうかを判定
   */
  static isValidVoiceCommand(value: unknown): value is string {
    return (
      typeof value === "string" && PerplexityConfig.isValidVoiceCommand(value)
    );
  }
}

/**
 * 厳密なバリデーターコレクション
 */
export class StrictValidators {
  /**
   * APIキーの厳密な検証
   */
  static validateApiKey(apiKey: unknown): apiKey is string {
    return typeof apiKey === "string" && apiKey.trim().length > 0;
  }

  /**
   * リクエストペイロードの厳密な検証
   */
  static validateRequest(request: unknown): request is PerplexityRequest {
    if (!TypeGuards.isPerplexityRequest(request)) return false;

    // 追加の業務ルール検証
    const req = request as PerplexityRequest;

    // トークン数制限チェック
    if (
      req.max_tokens &&
      req.max_tokens > PerplexityConfig.DEFAULT_API_CONFIG.MAX_TOKENS
    ) {
      return false;
    }

    // 温度パラメータ範囲チェック
    if (req.temperature && (req.temperature < 0 || req.temperature > 2)) {
      return false;
    }

    return true;
  }

  /**
   * レスポンスデータの厳密な検証
   */
  static validateResponseData(data: unknown): data is PerplexityResponse {
    if (!TypeGuards.isPerplexityResponse(data)) return false;

    const response = data as PerplexityResponse;

    // 追加のビジネスルール検証
    return (
      response.choices.length > 0 &&
      response.choices.every(
        (choice) => choice.message.content.trim().length > 0,
      ) &&
      TypeGuards.isPerplexityUsage(response.usage)
    );
  }

  /**
   * 型安全なレスポンス解析
   */
  static safeParseResponse(
    data: unknown,
  ):
    | { success: true; data: PerplexityResponse }
    | { success: false; error: string } {
    try {
      if (!this.validateResponseData(data)) {
        return { success: false, error: "Invalid response format" };
      }

      return { success: true, data: data as PerplexityResponse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      };
    }
  }

  /**
   * 型安全なコンテキスト解析
   */
  static safeParseContext(
    data: unknown,
  ):
    | { success: true; data: ResearchContext }
    | { success: false; error: string } {
    try {
      if (!TypeGuards.isResearchContext(data)) {
        return { success: false, error: "Invalid ResearchContext format" };
      }

      return { success: true, data: data as ResearchContext };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      };
    }
  }

  /**
   * アサーション型のランタイム型チェック
   */
  static assertPerplexityResponse(
    data: unknown,
  ): asserts data is PerplexityResponse {
    if (!this.validateResponseData(data)) {
      throw new Error("Invalid PerplexityResponse");
    }
  }

  /**
   * アサーション型のランタイム型チェック
   */
  static assertResearchContext(data: unknown): asserts data is ResearchContext {
    if (!TypeGuards.isResearchContext(data)) {
      throw new Error("Invalid ResearchContext");
    }
  }

  /**
   * 配列の全要素が指定された型であることを検証
   */
  static validateArrayOf<T>(
    array: unknown[],
    validator: (item: unknown) => item is T,
  ): array is T[] {
    return Array.isArray(array) && array.every(validator);
  }
}

/**
 * 型安全なオプションパーサー
 */
export class SafeOptionParser {
  /**
   * unknown値から数値を安全に抽出
   */
  static parseNumber(value: unknown, fallback: number): number {
    if (typeof value === "number" && !isNaN(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  /**
   * unknown値から文字列を安全に抽出
   */
  static parseString(value: unknown, fallback: string): string {
    if (typeof value === "string") {
      return value;
    }
    return fallback;
  }

  /**
   * unknown値からブール値を安全に抽出
   */
  static parseBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const lowercased = value.toLowerCase();
      if (lowercased === "true" || lowercased === "1") return true;
      if (lowercased === "false" || lowercased === "0") return false;
    }
    if (typeof value === "number") {
      return Boolean(value);
    }
    return fallback;
  }

  /**
   * unknown値から配列を安全に抽出
   */
  static parseArray<T>(
    value: unknown,
    itemValidator: (item: unknown) => item is T,
    fallback: T[] = [],
  ): T[] {
    if (!Array.isArray(value)) return fallback;

    const validItems = value.filter(itemValidator);
    return validItems.length === value.length ? validItems : fallback;
  }
}

/**
 * JSONスキーマ風のバリデーター
 */
export class SchemaValidator {
  /**
   * オブジェクトがスキーマに適合するかチェック
   */
  static validateSchema(
    data: unknown,
    schema: {
      required?: string[];
      properties?: Record<string, (value: unknown) => boolean>;
      additionalProperties?: boolean;
    },
  ): boolean {
    if (!data || typeof data !== "object") return false;

    const obj = data as Record<string, unknown>;

    // 必須フィールドのチェック
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj)) return false;
      }
    }

    // プロパティの型チェック
    if (schema.properties) {
      for (const [key, validator] of Object.entries(schema.properties)) {
        if (key in obj && !validator(obj[key])) {
          return false;
        }
      }
    }

    // 追加プロパティの許可チェック
    if (schema.additionalProperties === false && schema.properties) {
      const allowedKeys = new Set(Object.keys(schema.properties));
      if (schema.required) {
        schema.required.forEach((key) => allowedKeys.add(key));
      }

      for (const key of Object.keys(obj)) {
        if (!allowedKeys.has(key)) return false;
      }
    }

    return true;
  }
}
