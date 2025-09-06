/**
 * 統合エラーハンドリングシステム
 *
 * 全てのPerplexity API関連のエラーを統一的に処理し、
 * 一貫したエラーレスポンスとユーザー向けメッセージを提供する
 */

import {
  PerplexityAPIError,
  PerplexityErrorType,
  PerplexityErrorDetail,
  type PerplexityError,
} from "./types";
import { PerplexityConfig } from "./config";

export type ErrorContext =
  | "authentication"
  | "rate_limit"
  | "network"
  | "service"
  | "validation"
  | "unknown";

/**
 * 統合エラーハンドラー
 */
export class ErrorHandler {
  private static readonly ERROR_PATTERNS = {
    // 認証系エラー
    authentication: [
      /unauthorized/i,
      /invalid.*api.*key/i,
      /authentication.*failed/i,
    ],

    // レート制限系エラー
    rate_limit: [/rate.*limit/i, /quota.*exceeded/i, /too.*many.*requests/i],

    // ネットワーク系エラー
    network: [/fetch.*failed/i, /network.*error/i, /connection.*failed/i],

    // サービス系エラー
    service: [/service.*unavailable/i, /internal.*server.*error/i],
  } as const;

  /**
   * エラーを統一的に処理する
   */
  static handleError(
    error: unknown,
    context?: ErrorContext,
  ): PerplexityAPIError {
    // 既にPerplexityAPIErrorの場合はそのまま返す
    if (error instanceof PerplexityAPIError) {
      return error;
    }

    const errorMessage = this.extractErrorMessage(error);
    const detectedContext = context || this.detectErrorContext(errorMessage);
    const errorDetail = this.createErrorDetail(errorMessage, detectedContext);

    return new PerplexityAPIError(errorDetail);
  }

  /**
   * HTTPレスポンスエラーを処理する
   */
  static handleHttpError(
    response: Response,
    errorData?: PerplexityError,
  ): PerplexityAPIError {
    const httpStatus = response.status;
    const apiErrorMessage =
      errorData?.message || `HTTP ${httpStatus}: ${response.statusText}`;

    const context = this.mapHttpStatusToContext(httpStatus);
    const errorDetail = this.createErrorDetail(
      apiErrorMessage,
      context,
      httpStatus,
    );

    // レート制限の場合はRetry-Afterヘッダーを考慮
    if (httpStatus === 429) {
      errorDetail.retryAfter = this.extractRetryAfter(response);
    }

    return new PerplexityAPIError(errorDetail);
  }

  /**
   * バリデーションエラーを処理する
   */
  static handleValidationError(message: string): PerplexityAPIError {
    const errorDetail: PerplexityErrorDetail = {
      type: PerplexityErrorType.INVALID_REQUEST,
      message,
      userMessage: "入力内容に問題があります。内容を確認してください。",
      retryable: false,
    };

    return new PerplexityAPIError(errorDetail);
  }

  /**
   * レスポンス形式エラーを処理する
   */
  static handleResponseFormatError(): PerplexityAPIError {
    const errorDetail: PerplexityErrorDetail = {
      type: PerplexityErrorType.INVALID_RESPONSE,
      message: PerplexityConfig.ERROR_MESSAGES.INVALID_RESPONSE,
      userMessage:
        "不正なレスポンス形式です。しばらく時間をおいて再度お試しください。",
      retryable: true,
    };

    return new PerplexityAPIError(errorDetail);
  }

  /**
   * 空レスポンスエラーを処理する
   */
  static handleEmptyResponseError(): PerplexityAPIError {
    const errorDetail: PerplexityErrorDetail = {
      type: PerplexityErrorType.EMPTY_RESPONSE,
      message: PerplexityConfig.ERROR_MESSAGES.EMPTY_RESPONSE,
      userMessage:
        "レスポンスが空です。しばらく時間をおいて再度お試しください。",
      retryable: true,
    };

    return new PerplexityAPIError(errorDetail);
  }

  /**
   * エラーメッセージを抽出する
   */
  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return PerplexityConfig.ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * エラーコンテキストを検出する
   */
  private static detectErrorContext(errorMessage: string): ErrorContext {
    for (const [contextType, patterns] of Object.entries(this.ERROR_PATTERNS)) {
      if (patterns.some((pattern) => pattern.test(errorMessage))) {
        return contextType as ErrorContext;
      }
    }
    return "unknown";
  }

  /**
   * HTTPステータスをエラーコンテキストにマッピングする
   */
  private static mapHttpStatusToContext(httpStatus: number): ErrorContext {
    if (httpStatus === 401) return "authentication";
    if (httpStatus === 429) return "rate_limit";
    if (httpStatus >= 500) return "service";
    return "unknown";
  }

  /**
   * エラー詳細を作成する
   */
  private static createErrorDetail(
    message: string,
    context: ErrorContext,
    httpStatus?: number,
  ): PerplexityErrorDetail {
    switch (context) {
      case "authentication":
        return {
          type: PerplexityErrorType.AUTHENTICATION_FAILED,
          message,
          userMessage: "認証に失敗しました。APIキーを確認してください。",
          httpStatus,
          retryable: false,
        };

      case "rate_limit":
        return {
          type: PerplexityErrorType.RATE_LIMIT_EXCEEDED,
          message,
          userMessage:
            "リクエスト制限に達しました。しばらく時間をおいて再度お試しください。",
          httpStatus,
          retryable: true,
        };

      case "network":
        return {
          type: PerplexityErrorType.NETWORK_ERROR,
          message,
          userMessage: "ネットワーク接続に問題があります。",
          retryable: true,
        };

      case "service":
        return {
          type: PerplexityErrorType.SERVICE_UNAVAILABLE,
          message,
          userMessage: "サービスが一時的に利用できません。",
          httpStatus,
          retryable: true,
        };

      case "validation":
        return {
          type: PerplexityErrorType.INVALID_REQUEST,
          message,
          userMessage: "入力内容に問題があります。",
          retryable: false,
        };

      default:
        return {
          type: PerplexityErrorType.UNKNOWN_ERROR,
          message,
          userMessage: "予期しないエラーが発生しました。",
          httpStatus,
          retryable: true,
        };
    }
  }

  /**
   * Retry-Afterヘッダーを抽出する
   */
  private static extractRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get("Retry-After");
    return retryAfter ? parseInt(retryAfter, 10) : undefined;
  }
}
