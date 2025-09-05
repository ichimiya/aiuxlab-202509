/**
 * Perplexity API 型定義
 * @see https://docs.perplexity.ai/reference/post_chat_completions
 */

export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_domain_filter?: string[];
  search_recency_filter?: "month" | "week" | "day" | "hour";
  return_citations?: boolean;
  return_images?: boolean;
  return_related_questions?: boolean;
}

export interface PerplexityChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: "stop" | "length" | "content_filter" | null;
}

export interface PerplexityUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface PerplexityResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: PerplexityChoice[];
  usage: PerplexityUsage;
}

export interface PerplexityError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
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
