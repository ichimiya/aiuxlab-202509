import { describe, expect, it } from "vitest";
import {
  buildSelectionInsightTopicPrompt,
  buildSelectionInsightExpansionPrompt,
} from "./selectionInsights";

const selection = {
  text: "2024年以降、生成AIスタートアップへの投資額が再加速している",
  context: "生成AIスタートアップの投資額推移",
  origin: {
    nodeId: "paragraph-growth",
    resultId: "result-001",
  },
  section: {
    heading: "市場規模と成長率",
    summary: "市場規模と成長率の概要",
  },
};

describe("selectionInsights prompts", () => {
  it("トピック抽出プロンプトにクエリとセクション情報を含める", () => {
    const prompt = buildSelectionInsightTopicPrompt({
      researchId: "research-1",
      researchQuery: "AI エージェント市場の主要プレイヤー",
      selection: selection as any,
      requestedTopics: 2,
    });

    expect(prompt).toContain("### RESEARCH_QUERY");
    expect(prompt).toContain("AI エージェント市場の主要プレイヤー");
    expect(prompt).toContain("### SECTION_SUMMARY");
    expect(prompt).toContain("市場規模と成長率の概要");
    expect(prompt).toContain("### SECTION_ANCHOR_ID");
    expect(prompt).toContain("paragraph-growth");
  });

  it("拡張プロンプトにもクエリとセクション情報を含める", () => {
    const prompt = buildSelectionInsightExpansionPrompt({
      researchId: "research-1",
      researchQuery: "AI エージェント市場の主要プレイヤー",
      selection: selection as any,
      topics: [
        {
          id: "topic-1",
          title: "投資トレンド",
          objective: "投資額再加速の背景を把握する",
          priority: "high",
          guidingQuestions: ["再加速の主要要因は？"],
        },
      ],
    });

    expect(prompt).toContain("### RESEARCH_QUERY");
    expect(prompt).toContain("AI エージェント市場の主要プレイヤー");
    expect(prompt).toContain("### SECTION_SUMMARY");
    expect(prompt).toContain("市場規模と成長率の概要");
    expect(prompt).toContain("### SECTION_ANCHOR_ID");
    expect(prompt).toContain("paragraph-growth");
  });
});
