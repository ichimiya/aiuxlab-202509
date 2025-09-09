import { describe, it, expect } from "vitest";

// Red: まだPort/Schemaは未実装。コンパイルが失敗してRedになることを期待。
import type {
  ContentProcessingPort,
  ContentProcessingInput,
} from "./contentProcessing";
import { ContentProcessingOutputSchema } from "@/shared/ai/schemas/contentProcessing";

describe("ContentProcessingPort contract", () => {
  it("process(input) が共通DTOを返す（スキーマに合致）", async () => {
    // ダミー実装（Portの形だけ）
    const adapter: ContentProcessingPort = {
      async process(input: ContentProcessingInput) {
        return {
          htmlContent: `<section><h1>Title</h1><p>${
            input.markdown
          }</p></section>`,
          processedCitations: [
            { id: "ref1", number: 1, url: "https://example.com" },
          ],
        };
      },
    };

    const output = await adapter.process({
      markdown: "Hello",
      citations: ["[1] https://example.com"],
      searchResults: [{ title: "ex", url: "https://example.com" }],
    });

    const parsed = ContentProcessingOutputSchema.safeParse(output);
    expect(parsed.success).toBe(true);
  });
});
