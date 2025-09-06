import { describe, it, expect } from "vitest";
import {
  PerplexityResearchClient,
  PerplexityClient,
  PerplexityAPIError,
} from ".";

describe("Perplexity Research module", () => {
  it("エクスポート（新名/互換エイリアス/エラー型）が存在する", () => {
    expect(typeof PerplexityResearchClient).toBe("function");
    expect(typeof PerplexityClient).toBe("function");
    expect(typeof PerplexityAPIError).toBe("function");
  });
});
