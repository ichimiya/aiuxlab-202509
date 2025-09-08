import { describe, it, expect } from "vitest";

// Red: 未実装のエラーマッピングをテスト定義
import { mapProviderError } from "./errors";
import { ApplicationError } from "@/shared/useCases/errors";

describe("external/common/errors", () => {
  it("AWS系UnauthorizedをUNAUTHORIZEDに正規化する", () => {
    const e = new Error("NotAuthorizedException: invalid credentials");
    const app = mapProviderError(e);
    expect(app).toBeInstanceOf(ApplicationError);
    expect(app.code).toBe("UNAUTHORIZED");
  });

  it("ネットワークタイムアウトをTIMEOUTに正規化する", () => {
    const e = new Error("ETIMEDOUT: request timed out");
    const app = mapProviderError(e);
    expect(app.code).toBe("TIMEOUT");
  });
});
