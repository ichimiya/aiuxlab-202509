import { describe, it, expect } from "vitest";

describe("llm/adapters/bedrock/queryOptimizationAdapter", () => {
  it("BedrockQueryOptimizationAdapter をエクスポートする", async () => {
    const mod = (await import("./queryOptimizationAdapter")) as unknown as {
      BedrockQueryOptimizationAdapter: unknown;
    };
    expect(typeof mod.BedrockQueryOptimizationAdapter).toBe("function");
  });
});
