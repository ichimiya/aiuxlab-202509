/**
 * Perplexity API 型定義 (OpenAI SDK使用)
 * @see https://docs.perplexity.ai/reference/post_chat_completions
 */

import type OpenAI from "openai";

/**
 * Perplexity API検索結果の詳細情報
 */
export interface PerplexitySearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  last_updated?: string;
}

/**
 * Perplexity API拡張レスポンス型
 * OpenAIのChatCompletionにPerplexity固有のフィールドを追加
 */
export interface PerplexityResponse extends OpenAI.Chat.ChatCompletion {
  citations?: string[];
  search_results?: PerplexitySearchResult[];
  related_questions?: string[];
}

// OpenAI SDKの型を再エクスポート
export type PerplexityMessage = OpenAI.Chat.ChatCompletionMessageParam;
export type PerplexityChoice = OpenAI.Chat.ChatCompletion.Choice;
export type PerplexityUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};
/**
 * Perplexity API エラー型
 */
export type PerplexityError = {
  message: string;
  type?: string;
  code?: string;
  status?: number;
};

/**
 * Perplexity API リクエスト形式
 */
export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  return_citations?: boolean;
  return_related_questions?: boolean;
}

/**
 * リサーチクエリのコンテキスト
 */
export interface ResearchContext {
  query: string;
  selectedText?: string;
  voiceCommand?: string;
}

/**
 * Perplexity APIクライアント設定
 */
export interface PerplexityConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

/**
 * Perplexity API エラー分類
 */
export enum PerplexityErrorType {
  // 認証・認可エラー
  AUTHENTICATION_FAILED = "authentication_failed",
  API_KEY_INVALID = "api_key_invalid",
  INSUFFICIENT_PERMISSIONS = "insufficient_permissions",

  // API制限エラー
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  QUOTA_EXCEEDED = "quota_exceeded",
  TOKEN_LIMIT_EXCEEDED = "token_limit_exceeded",

  // リクエストエラー
  INVALID_REQUEST = "invalid_request",
  INVALID_PARAMETERS = "invalid_parameters",
  CONTENT_FILTERED = "content_filtered",

  // サービスエラー
  SERVICE_UNAVAILABLE = "service_unavailable",
  INTERNAL_SERVER_ERROR = "internal_server_error",
  MODEL_OVERLOADED = "model_overloaded",

  // ネットワークエラー
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  CONNECTION_ERROR = "connection_error",

  // データエラー
  EMPTY_RESPONSE = "empty_response",
  INVALID_RESPONSE = "invalid_response",
  PARSING_ERROR = "parsing_error",

  // 不明なエラー
  UNKNOWN_ERROR = "unknown_error",
}

/**
 * エラーレスポンス形式
 */
export interface PerplexityErrorDetail {
  type: PerplexityErrorType;
  message: string;
  userMessage: string; // ユーザー向けメッセージ
  code?: string;
  httpStatus?: number;
  retryable: boolean;
  retryAfter?: number; // レート制限時の待機時間（秒）
  details?: Record<string, unknown>;
}

/**
 * Perplexity API専用エラークラス
 */
export class PerplexityAPIError extends Error {
  public readonly type: PerplexityErrorType;
  public readonly userMessage: string;
  public readonly httpStatus?: number;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly details?: Record<string, unknown>;

  constructor(errorDetail: PerplexityErrorDetail) {
    super(errorDetail.message);
    this.name = "PerplexityAPIError";
    this.type = errorDetail.type;
    this.userMessage = errorDetail.userMessage;
    this.httpStatus = errorDetail.httpStatus;
    this.retryable = errorDetail.retryable;
    this.retryAfter = errorDetail.retryAfter;
    this.details = errorDetail.details;
  }
}
