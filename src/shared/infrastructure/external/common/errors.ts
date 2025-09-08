import { ApplicationError } from "@/shared/useCases/errors";

function msg(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return "Unknown error";
  }
}

/**
 * 外部プロバイダのエラーをApplicationErrorに正規化
 */
export function mapProviderError(err: unknown): ApplicationError {
  const m = msg(err).toLowerCase();

  // 認可/認証
  if (
    m.includes("notauthorized") ||
    m.includes("unauthorized") ||
    m.includes("invalid credentials") ||
    m.includes("invalid api key") ||
    m.includes("access denied")
  ) {
    return new ApplicationError("Unauthorized", {
      code: "UNAUTHORIZED",
      status: 401,
      cause: err,
    });
  }

  // タイムアウト/ネットワーク
  if (
    m.includes("etimedout") ||
    m.includes("timed out") ||
    m.includes("timeout")
  ) {
    return new ApplicationError("Request timeout", {
      code: "TIMEOUT",
      status: 504,
      cause: err,
    });
  }

  // レート制限
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return new ApplicationError("Rate limited", {
      code: "RATE_LIMIT",
      status: 429,
      cause: err,
    });
  }

  // 不正応答
  if (m.includes("invalid") && m.includes("response")) {
    return new ApplicationError("Invalid provider response", {
      code: "INVALID_RESPONSE",
      status: 502,
      cause: err,
    });
  }

  return new ApplicationError("Provider error", {
    code: "PROVIDER_ERROR",
    status: 502,
    cause: err,
  });
}
