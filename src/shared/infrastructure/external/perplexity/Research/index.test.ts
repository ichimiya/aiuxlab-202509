import { describe, it, expect } from "vitest";
import { PerplexityResearchClient, PerplexityAPIError } from ".";

describe("Perplexity Research module", () => {
  it("エクスポート（新名/エラー型）が存在する", () => {
    expect(typeof PerplexityResearchClient).toBe("function");
    expect(typeof PerplexityAPIError).toBe("function");
  });
});
