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

describe("search/adapters/perplexity/researchAdapter", () => {
  it("PerplexityResearchAdapter をエクスポートする", async () => {
    const mod = (await import("./researchAdapter")) as unknown as {
      PerplexityResearchAdapter: unknown;
    };
    expect(typeof mod.PerplexityResearchAdapter).toBe("function");
  });
});
