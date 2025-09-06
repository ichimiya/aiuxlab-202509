/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

let createdConfig: { baseURL?: string } | undefined;

vi.mock("axios", () => {
  const instance = (
    config: unknown,
  ): Promise<{ data: unknown; config: unknown }> =>
    Promise.resolve({ data: { ok: true }, config });
  (instance as unknown as { interceptors: unknown }).interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  } as unknown as {
    request: { use: (fn: unknown) => void };
    response: { use: (fn: unknown) => void };
  };
  const create = vi.fn((cfg: { baseURL?: string }) => {
    createdConfig = cfg;
    return instance as unknown as (
      cfg: unknown,
    ) => Promise<{ data: unknown; config: unknown }>;
  });
  const axiosDefault = { create } as const;
  return { default: axiosDefault as unknown, create } as unknown as Record<
    string,
    unknown
  >;
});

describe("mutator (browser)", () => {
  beforeEach(() => {
    vi.resetModules();
    createdConfig = undefined;
    delete (process.env as Record<string, string | undefined>)
      .NEXT_PUBLIC_API_BASE_URL;
    vi.stubEnv("NODE_ENV", "development");
  });

  it("ブラウザでは相対パス /api を使う（ポートに自動追従）", async () => {
    await import("./mutator");
    expect(createdConfig).toBeTruthy();
    expect(createdConfig!.baseURL).toBe("/api");
  });
});
