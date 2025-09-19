import { describe, it, expect, beforeEach, vi } from "vitest";

// Red: まだlogger未実装。期待動作をテスト定義。

const ORIG_ENV = { ...process.env };

describe("logger", () => {
  beforeEach(() => {
    // NOTE: Nodeの型定義では env は読み取り専用だが、キャストで上書き可能
    Object.assign(process.env, ORIG_ENV);
    vi.restoreAllMocks();
  });

  it("productionでdebugは出力しないがinfoは出力する", async () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    // 明示レベル指定なし
    const { logger } = await import("./logger");

    const spyDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const spyInfo = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.debug("should not log");
    logger.info("should log");

    expect(spyDebug).not.toHaveBeenCalled();
    expect(spyInfo).toHaveBeenCalled();
  });

  it("LOG_LEVEL=warn ではinfo/debugを抑制し、warn/errorは出力", async () => {
    Object.assign(process.env, {
      NODE_ENV: "development",
      NEXT_PUBLIC_LOG_LEVEL: "warn",
    });
    const { logger } = await import("./logger");

    const spyDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const spyInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.debug("no");
    logger.info("no");
    logger.warn("yes");
    logger.error("yes");

    expect(spyDebug).not.toHaveBeenCalled();
    expect(spyInfo).not.toHaveBeenCalled();
    expect(spyWarn).toHaveBeenCalled();
    expect(spyError).toHaveBeenCalled();
  });
});
