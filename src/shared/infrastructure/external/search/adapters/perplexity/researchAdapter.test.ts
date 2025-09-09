import { describe, it, expect } from "vitest";

describe("search/adapters/perplexity/researchAdapter", () => {
  it("PerplexityResearchAdapter をエクスポートする", async () => {
    const mod = (await import("./researchAdapter")) as unknown as {
      PerplexityResearchAdapter: unknown;
    };
    expect(typeof mod.PerplexityResearchAdapter).toBe("function");
  });
});
