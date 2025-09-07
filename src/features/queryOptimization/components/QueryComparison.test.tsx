/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryComparison } from "./QueryComparison";

describe("QueryComparison", () => {
  it("最適化前後のテキストを表示し、追加語を<mark>で強調", () => {
    const original = "AI 危険";
    const optimized = "AI 危険 安全対策"; // 追加: 安全対策

    render(<QueryComparison original={original} optimized={optimized} />);

    const before = screen.getByRole("region", { name: "最適化前" });
    const after = screen.getByRole("region", { name: "最適化後" });

    expect(within(before).getByText(original)).toBeTruthy();

    // 追加語が<mark>で強調表示されている
    const mark = within(after).getByText("安全対策");
    expect(mark.tagName).toBe("MARK");
  });
});
