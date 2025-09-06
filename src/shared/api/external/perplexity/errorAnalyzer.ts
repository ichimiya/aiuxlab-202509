import {
  PerplexityErrorType,
  PerplexityErrorDetail,
  PerplexityAPIError,
  type PerplexityError,
} from "./types";

/**
 * Perplexity APIエラー解析・分類クラス
 */
export class PerplexityErrorAnalyzer {
  /**
   * HTTPエラーレスポンスを分析してエラー詳細を生成
   */
  static analyzeHttpError(
    response: Response,
    errorData?: PerplexityError,
  ): PerplexityErrorDetail {
    const httpStatus = response.status;

    // HTTPステータスベースの分類
    switch (httpStatus) {
      case 401:
        return this.createAuthenticationError(errorData);
      case 403:
        return this.createPermissionError(errorData);
      case 429:
        return this.createRateLimitError(response, errorData);
      case 413:
        return this.createTokenLimitError(errorData);
      case 500:
      case 502:
      case 503:
      case 504:
        return this.createServiceError(httpStatus, errorData);
      default:
        return this.createUnknownHttpError(httpStatus, errorData);
    }
  }

  /**
   * ネットワークエラーを分析してエラー詳細を生成
   */
  static analyzeNetworkError(error: Error): PerplexityErrorDetail {
    if (error.name === "AbortError") {
      return {
        type: PerplexityErrorType.TIMEOUT_ERROR,
        message: "Request timeout",
        userMessage:
          "リクエストがタイムアウトしました。しばらく時間をおいて再度お試しください。",
        retryable: true,
      };
    }

    if (error.message.includes("fetch")) {
      return {
        type: PerplexityErrorType.CONNECTION_ERROR,
        message: "Connection failed",
        userMessage:
          "ネットワーク接続に問題があります。インターネット接続を確認してください。",
        retryable: true,
      };
    }

    return {
      type: PerplexityErrorType.NETWORK_ERROR,
      message: error.message,
      userMessage:
        "ネットワークエラーが発生しました。しばらく時間をおいて再度お試しください。",
      retryable: true,
    };
  }

  /**
   * レスポンス検証エラーを生成
   */
  static analyzeResponseValidationError(): PerplexityErrorDetail {
    return {
      type: PerplexityErrorType.INVALID_RESPONSE,
      message: "Invalid response format",
      userMessage:
        "不正なレスポンス形式です。しばらく時間をおいて再度お試しください。",
      retryable: true,
    };
  }

  /**
   * 空レスポンスエラーを生成
   */
  static analyzeEmptyResponseError(): PerplexityErrorDetail {
    return {
      type: PerplexityErrorType.EMPTY_RESPONSE,
      message: "Empty response received",
      userMessage:
        "レスポンスが空です。しばらく時間をおいて再度お試しください。",
      retryable: true,
    };
  }

  /**
   * 認証エラーを作成
   */
  private static createAuthenticationError(
    errorData?: PerplexityError,
  ): PerplexityErrorDetail {
    const message = errorData?.error?.message || "Authentication failed";
    return {
      type: PerplexityErrorType.AUTHENTICATION_FAILED,
      message,
      userMessage: "認証に失敗しました。APIキーを確認してください。",
      httpStatus: 401,
      retryable: false,
    };
  }

  /**
   * 権限エラーを作成
   */
  private static createPermissionError(
    errorData?: PerplexityError,
  ): PerplexityErrorDetail {
    const message = errorData?.error?.message || "Permission denied";
    return {
      type: PerplexityErrorType.INSUFFICIENT_PERMISSIONS,
      message,
      userMessage: "このリソースにアクセスする権限がありません。",
      httpStatus: 403,
      retryable: false,
    };
  }

  /**
   * レート制限エラーを作成
   */
  private static createRateLimitError(
    response: Response,
    errorData?: PerplexityError,
  ): PerplexityErrorDetail {
    const retryAfter = this.extractRetryAfter(response);
    const message = errorData?.error?.message || "Rate limit exceeded";

    return {
      type: PerplexityErrorType.RATE_LIMIT_EXCEEDED,
      message,
      userMessage: `リクエスト制限に達しました。${
        retryAfter ? `${retryAfter}秒後` : "しばらく時間をおいて"
      }に再度お試しください。`,
      httpStatus: 429,
      retryable: true,
      retryAfter,
    };
  }

  /**
   * トークン制限エラーを作成
   */
  private static createTokenLimitError(
    errorData?: PerplexityError,
  ): PerplexityErrorDetail {
    const message = errorData?.error?.message || "Token limit exceeded";
    return {
      type: PerplexityErrorType.TOKEN_LIMIT_EXCEEDED,
      message,
      userMessage:
        "トークン制限に達しました。リクエストサイズを小さくしてください。",
      httpStatus: 413,
      retryable: false,
    };
  }

  /**
   * サービスエラーを作成
   */
  private static createServiceError(
    httpStatus: number,
    errorData?: PerplexityError,
  ): PerplexityErrorDetail {
    const message = errorData?.error?.message || "Service error";
    let type: PerplexityErrorType;
    let userMessage: string;

    switch (httpStatus) {
      case 503:
        type = PerplexityErrorType.SERVICE_UNAVAILABLE;
        userMessage =
          "サービスが一時的に利用できません。しばらく時間をおいて再度お試しください。";
        break;
      default:
        type = PerplexityErrorType.INTERNAL_SERVER_ERROR;
        userMessage =
          "サーバー内部エラーが発生しました。しばらく時間をおいて再度お試しください。";
    }

    return {
      type,
      message,
      userMessage,
      httpStatus,
      retryable: true,
    };
  }

  /**
   * 不明なHTTPエラーを作成
   */
  private static createUnknownHttpError(
    httpStatus: number,
    errorData?: PerplexityError,
  ): PerplexityErrorDetail {
    const message = errorData?.error?.message || `HTTP ${httpStatus} error`;
    return {
      type: PerplexityErrorType.UNKNOWN_ERROR,
      message,
      userMessage:
        "予期しないエラーが発生しました。しばらく時間をおいて再度お試しください。",
      httpStatus,
      retryable: true,
    };
  }

  /**
   * Retry-Afterヘッダーを抽出
   */
  private static extractRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get("Retry-After");
    return retryAfter ? parseInt(retryAfter, 10) : undefined;
  }

  /**
   * エラーオブジェクトをPerplexityAPIErrorに変換
   */
  static createPerplexityError(
    errorDetail: PerplexityErrorDetail,
  ): PerplexityAPIError {
    return new PerplexityAPIError(errorDetail);
  }
}
