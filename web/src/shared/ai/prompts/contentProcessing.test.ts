import { describe, it, expect } from "vitest";

import { ContentProcessingInputSchema } from "@/shared/ai/schemas/contentProcessing";
import { jsonSchema } from "@/shared/ai/prompts/utils";

// Red: 共通プロンプトビルダーの存在と内容を検証（未実装）
import { buildContentProcessingPrompt } from "./contentProcessing";

describe("prompts/contentProcessing", () => {
  it("セマンティック変換ルールと引用処理、JSONスキーマを含む", () => {
    const input = ContentProcessingInputSchema.parse({
      markdown: "# Title\nHello [1]",
      citations: ["https://example.com"],
      searchResults: [{ title: "ex", url: "https://example.com" }],
    });

    const prompt = buildContentProcessingPrompt(input);
    expect(typeof prompt).toBe("string");
    expect(prompt).toContain("セマンティック変換ルール");
    expect(prompt).toContain("引用情報の処理");
    // jsonSchemaの一部が含まれること
    const schemaSnippet = jsonSchema([
      '  "htmlContent": string,',
      '  "processedCitations": Array<{ id: string; number: number; url: string; title?: string; domain?: string }>',
    ]);
    expect(prompt).toContain(schemaSnippet.trim().split("\n")[0]);
    // 入力が埋め込まれていること
    expect(prompt).toContain("Title");
    expect(prompt).toContain("https://example.com");
  });
});
