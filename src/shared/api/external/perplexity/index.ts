/**
 * Perplexity API クライアント エクスポート
 */

// メインクラス
export { PerplexityClient } from "./client";
export { ResearchService } from "./researchService";

// 統合されたユーティリティ
export { ErrorHandler } from "./errorHandler";
export { PerplexityConfig } from "./config";
export {
  TextUtils,
  RelevanceCalculator,
  ValidationUtils,
  IdGenerator,
} from "./utils";
export { TypeGuards, StrictValidators } from "./typeGuards";

// 型定義
export type {
  PerplexityConfig as IPerplexityConfig,
  PerplexityResponse,
  PerplexityError,
  PerplexityMessage,
  ResearchContext,
  PerplexityErrorType,
  PerplexityErrorDetail,
} from "./types";
export { PerplexityAPIError } from "./types";

// 音声コマンド型
export type { VoiceCommandType } from "./config";
