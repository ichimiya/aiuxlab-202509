/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OptimizationSuggestions } from "./OptimizationSuggestions";

describe("OptimizationSuggestions", () => {
  it("観点・理由・追調査を表示する", () => {
    render(
      <OptimizationSuggestions
        addedAspects={["規制動向", "事故事例"]}
        improvementReason="曖昧さの解消と具体性の付与"
        suggestedFollowups={["国際比較", "安全基準"]}
      />,
    );

    expect(screen.getByText("追加された観点")).toBeTruthy();
    expect(screen.getByText("規制動向")).toBeTruthy();
    expect(screen.getByText("事故事例")).toBeTruthy();

    expect(screen.getByText("改善の理由")).toBeTruthy();
    expect(screen.getByText(/具体性/)).toBeTruthy();

    expect(screen.getByText("推奨追加調査")).toBeTruthy();
    expect(screen.getByText("国際比較")).toBeTruthy();
    expect(screen.getByText("安全基準")).toBeTruthy();
  });
});
