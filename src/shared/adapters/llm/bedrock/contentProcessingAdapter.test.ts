import { describe, it, expect } from "vitest";

describe("llm/adapters/bedrock/contentProcessingAdapter", () => {
  it("BedrockContentProcessingAdapter をエクスポートする", async () => {
    const mod = (await import("./contentProcessingAdapter")) as unknown as {
      BedrockContentProcessingAdapter: unknown;
    };
    expect(typeof mod.BedrockContentProcessingAdapter).toBe("function");
  });
});
