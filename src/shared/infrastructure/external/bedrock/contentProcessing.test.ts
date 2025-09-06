import { describe, it, expect } from "vitest";

describe("bedrock/contentProcessing module", () => {
  it("BedrockContentProcessingClient と互換エイリアス(BedrockClient)をエクスポートする", async () => {
    const mod = (await import("./contentProcessing")) as unknown as {
      BedrockClient: unknown;
      BedrockContentProcessingClient: unknown;
      BedrockAPIError: unknown;
    };
    expect(typeof mod.BedrockContentProcessingClient).toBe("function");
    expect(typeof mod.BedrockClient).toBe("function");
    expect(typeof mod.BedrockAPIError).toBe("function");
  });
});
