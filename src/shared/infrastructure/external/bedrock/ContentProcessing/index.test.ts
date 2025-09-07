import { describe, it, expect } from "vitest";

describe("bedrock/contentProcessing module", () => {
  it("BedrockContentProcessingClient をエクスポートする", async () => {
    const mod = (await import(".")) as unknown as {
      BedrockContentProcessingClient: unknown;
      BedrockAPIError: unknown;
    };
    expect(typeof mod.BedrockContentProcessingClient).toBe("function");
    expect(typeof mod.BedrockAPIError).toBe("function");
  });
});
