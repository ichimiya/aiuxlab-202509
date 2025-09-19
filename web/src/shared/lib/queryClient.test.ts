import { describe, it, expect } from "vitest";
import { queryClient } from "./queryClient";

describe("queryClient", () => {
  it("正しい設定でQueryClientが作成される", () => {
    const options = queryClient.getDefaultOptions();

    expect(options.queries?.staleTime).toBe(1000 * 60 * 5); // 5分
    expect(options.queries?.gcTime).toBe(1000 * 60 * 30); // 30分
    expect(options.queries?.refetchOnWindowFocus).toBe(false);
    expect(options.mutations?.retry).toBe(1);
  });

  it("4xx系エラーではリトライしない", () => {
    const options = queryClient.getDefaultOptions();
    const retryFunction = options.queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    // 404エラーの場合
    const error404 = { response: { status: 404 } };
    expect(retryFunction(1, error404)).toBe(false);

    // 400エラーの場合
    const error400 = { response: { status: 400 } };
    expect(retryFunction(1, error400)).toBe(false);

    // 499エラーの場合
    const error499 = { response: { status: 499 } };
    expect(retryFunction(1, error499)).toBe(false);
  });

  it("5xx系エラーでは3回までリトライする", () => {
    const options = queryClient.getDefaultOptions();
    const retryFunction = options.queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    const error500 = { response: { status: 500 } };

    // 1回目、2回目はリトライ
    expect(retryFunction(0, error500)).toBe(true);
    expect(retryFunction(1, error500)).toBe(true);
    expect(retryFunction(2, error500)).toBe(true);

    // 3回目以降はリトライしない
    expect(retryFunction(3, error500)).toBe(false);
  });

  it("ネットワークエラーでは3回までリトライする", () => {
    const options = queryClient.getDefaultOptions();
    const retryFunction = options.queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    const networkError = { message: "Network Error" };

    expect(retryFunction(0, networkError)).toBe(true);
    expect(retryFunction(1, networkError)).toBe(true);
    expect(retryFunction(2, networkError)).toBe(true);
    expect(retryFunction(3, networkError)).toBe(false);
  });
});
