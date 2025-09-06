import { describe, it, expect } from "vitest";
import { ErrorHandler } from "./errorHandler";
import { PerplexityAPIError, PerplexityErrorType } from "./types";

describe("ErrorHandler", () => {
  describe("統合エラーハンドリング", () => {
    it("APIキー不正エラーを統一的に処理する", () => {
      const error = new Error("Invalid API key");
      const result = ErrorHandler.handleError(error, "authentication");

      expect(result).toBeInstanceOf(PerplexityAPIError);
      expect(result.type).toBe(PerplexityErrorType.AUTHENTICATION_FAILED);
      expect(result.retryable).toBe(false);
    });

    it("レート制限エラーを統一的に処理する", () => {
      const error = new Error("Rate limit exceeded");
      const result = ErrorHandler.handleError(error, "rate_limit");

      expect(result).toBeInstanceOf(PerplexityAPIError);
      expect(result.type).toBe(PerplexityErrorType.RATE_LIMIT_EXCEEDED);
      expect(result.retryable).toBe(true);
    });

    it("ネットワークエラーを統一的に処理する", () => {
      const error = new Error("fetch failed");
      const result = ErrorHandler.handleError(error, "network");

      expect(result).toBeInstanceOf(PerplexityAPIError);
      expect(result.type).toBe(PerplexityErrorType.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });

    it("不明なエラーを統一的に処理する", () => {
      const error = "unknown error";
      const result = ErrorHandler.handleError(error);

      expect(result).toBeInstanceOf(PerplexityAPIError);
      expect(result.type).toBe(PerplexityErrorType.UNKNOWN_ERROR);
    });
  });

  describe("エラーメッセージ変換", () => {
    it("技術的エラーをユーザー向けメッセージに変換する", () => {
      const error = new Error("HTTP 503 Service Unavailable");
      const result = ErrorHandler.handleError(error, "service");

      expect(result.userMessage).toContain("サービスが一時的に利用できません");
    });

    it("開発者向けメッセージも保持する", () => {
      const error = new Error("Network connection failed");
      const result = ErrorHandler.handleError(error, "network");

      expect(result.message).toContain("Network connection");
      expect(result.userMessage).toContain("ネットワーク");
    });
  });

  describe("エラー分類の一貫性", () => {
    it("同種のエラーは同じタイプに分類される", () => {
      const authError1 = ErrorHandler.handleError(
        new Error("Unauthorized"),
        "authentication",
      );
      const authError2 = ErrorHandler.handleError(
        new Error("Invalid token"),
        "authentication",
      );

      expect(authError1.type).toBe(authError2.type);
      expect(authError1.retryable).toBe(authError2.retryable);
    });

    it("リトライ可能性が適切に設定される", () => {
      const authError = ErrorHandler.handleError(
        new Error("Unauthorized"),
        "authentication",
      );
      const networkError = ErrorHandler.handleError(
        new Error("Connection failed"),
        "network",
      );

      expect(authError.retryable).toBe(false); // 認証エラーはリトライ不可
      expect(networkError.retryable).toBe(true); // ネットワークエラーはリトライ可能
    });
  });
});
