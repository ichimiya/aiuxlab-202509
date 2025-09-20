import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Red: 未実装のFactoryを前提にテスト
import { createContentProcessingAdapter } from "./factory";
import { createQueryOptimizationAdapter } from "./factory";

const ENV = { ...process.env };

describe("llm/factory", () => {
  beforeEach(() => {
    process.env = { ...ENV };
  });
  afterEach(() => {
    process.env = { ...ENV };
  });

  it("既定はbedrockを選択し、process関数を提供する", () => {
    delete process.env.LLM_PROVIDER;
    const adapter = createContentProcessingAdapter();
    expect(typeof adapter.process).toBe("function");
  });

  it("LLM_PROVIDER=vertex を指定するとvertex実装を選ぶ（存在チェックのみ）", () => {
    process.env.LLM_PROVIDER = "vertex";
    const adapter = createContentProcessingAdapter();
    expect(typeof adapter.process).toBe("function");
  });

  it("queryOptimizationアダプタがoptimizeQueryを提供する", () => {
    delete process.env.LLM_PROVIDER;
    const repo = createQueryOptimizationAdapter();
    expect(typeof (repo as { optimizeQuery: unknown }).optimizeQuery).toBe(
      "function",
    );
  });
});
