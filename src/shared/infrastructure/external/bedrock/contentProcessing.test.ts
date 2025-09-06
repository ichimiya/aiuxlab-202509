import { describe, it, expect } from "vitest";

describe("bedrock/contentProcessing module", () => {
  it("BedrockClient と IContentProcessingRepository をエクスポートする", async () => {
    const mod = (await import("./contentProcessing")) as unknown as {
      BedrockClient: unknown;
      BedrockAPIError: unknown;
    };
    expect(typeof mod.BedrockClient).toBe("function");
    expect(typeof mod.BedrockAPIError).toBe("function");
  });
});
