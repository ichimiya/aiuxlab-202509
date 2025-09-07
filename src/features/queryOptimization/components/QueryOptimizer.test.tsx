/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const optimizeMock = vi.fn();
vi.mock("../hooks/useQueryOptimization", () => ({
  useQueryOptimization: () => ({
    optimize: optimizeMock,
    isPending: false,
    isSuccess: true,
    data: {
      optimizedQuery: "AI 危険 安全対策",
      addedAspects: ["安全対策"],
      improvementReason: "具体性付与",
      confidence: 0.9,
      suggestedFollowups: ["規制動向"],
    },
  }),
}));

import { QueryOptimizer } from "./QueryOptimizer";

describe("QueryOptimizer", () => {
  beforeEach(() => {
    optimizeMock.mockReset();
  });

  it("クエリ入力→最適化ボタンでoptimizeが呼ばれ、結果UIが表示される", async () => {
    render(<QueryOptimizer />);

    const textarea = screen.getByLabelText("クエリ");
    fireEvent.change(textarea, { target: { value: "AI 危険" } });

    const button = screen.getByRole("button", { name: "最適化" });
    fireEvent.click(button);

    expect(optimizeMock).toHaveBeenCalledWith({ originalQuery: "AI 危険" });

    // 結果表示（ComparisonとSuggestionsの一部が描画される）
    expect(screen.getByRole("region", { name: "最適化後" })).toBeTruthy();
    expect(screen.getByText("追加された観点")).toBeTruthy();
  });
});
