import { describe, it, expect, vi } from "vitest";

vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn(async () => ({
            choices: [{ message: { role: "assistant", content: "ok" } }],
            citations: [],
            search_results: [],
          })),
        },
      };
      constructor() {}
    },
  };
});

describe("shared/adapters/search/perplexity/researchAdapter", () => {
  it("PerplexityResearchAdapter をエクスポートする", async () => {
    const mod = (await import(
      "@/shared/adapters/search/perplexity/researchAdapter"
    )) as unknown as {
      PerplexityResearchAdapter: unknown;
    };
    expect(typeof mod.PerplexityResearchAdapter).toBe("function");
  });
});
