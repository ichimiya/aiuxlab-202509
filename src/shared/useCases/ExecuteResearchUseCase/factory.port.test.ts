import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/infrastructure/external/llm/factory", () => {
  const mock = {
    process: vi.fn(async () => ({
      htmlContent: "<p>ok</p>",
      processedCitations: [],
    })),
  };
  return {
    createContentProcessingAdapter: () => mock,
    __mock__: mock,
  };
});

vi.mock("@/shared/infrastructure/external/perplexity", () => {
  class PerplexityResearchClient {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_cfg: { apiKey: string }) {}
    async search() {
      return {
        choices: [{ message: { content: "stub" } }],
        citations: [],
        search_results: [],
      };
    }
  }
  return { PerplexityResearchClient };
});

import { createExecuteResearchUseCase } from "./index";
import * as LlmFactory from "@/shared/infrastructure/external/llm/factory";

describe("createExecuteResearchUseCase - Port/Factory注入（Red）", () => {
  it("LLMファクトリから取得したAdapterを使って強化処理を行う", async () => {
    const useCase = createExecuteResearchUseCase("dummy-key");
    const research = await useCase.execute({ query: "test" });
    expect(research).toBeTruthy();
    // 期待: factoryのprocessが少なくとも1回は呼ばれている
    // Red: 現状はBedrock直接生成のため、呼ばれず失敗する
    // @ts-expect-error - get mock
    expect(LlmFactory.__mock__.process).toHaveBeenCalled();
  });
});
