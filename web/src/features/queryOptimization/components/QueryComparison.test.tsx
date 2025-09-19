/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryComparison } from "./QueryComparison";

describe("QueryComparison", () => {
  it("選択した候補クエリと差分ハイライトを表示する", () => {
    const original = "AI 危険";
    const candidate = {
      id: "candidate-1",
      query: "AI 危険 安全対策",
      coverageScore: 0.88,
      coverageExplanation: "安全対策観点を追加",
      addedAspects: ["安全対策"],
      improvementReason: "曖昧さを排除",
      suggestedFollowups: ["国際比較"],
    };

    render(<QueryComparison original={original} candidate={candidate} />);

    const before = screen.getByRole("region", { name: "最適化前" });
    const after = screen.getByRole("region", { name: "候補クエリ" });

    expect(within(before).getByText(original)).toBeTruthy();

    const mark = within(after).getByText("安全対策");
    expect(mark.tagName).toBe("MARK");
    expect(within(after).getByText("88%"));
  });
});
