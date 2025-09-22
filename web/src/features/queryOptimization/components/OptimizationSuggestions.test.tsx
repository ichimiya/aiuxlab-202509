/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptimizationSuggestions } from "./OptimizationSuggestions";

describe("OptimizationSuggestions", () => {
  it("候補ごとのクエリ・カバレッジ・説明を表示する", () => {
    render(
      <OptimizationSuggestions
        candidates={[
          {
            id: "candidate-1",
            query: "AI リスク 安全対策 国際比較",
            coverageScore: 0.91,
            coverageExplanation: "安全対策と比較観点を追加",
            addedAspects: ["安全対策", "国際比較"],
            improvementReason: "曖昧さの解消",
            suggestedFollowups: ["各国の規制"],
          },
          {
            id: "candidate-2",
            query: "AI 事故 重大事例",
            coverageScore: 0.78,
            coverageExplanation: "事故観点を補強",
            addedAspects: ["事故事例"],
            improvementReason: "事故の具体性を付与",
            suggestedFollowups: ["事故統計"],
          },
        ]}
        selectedCandidateId="candidate-1"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("AI リスク 安全対策 国際比較")).toBeTruthy();
    expect(screen.getByText("AI 事故 重大事例")).toBeTruthy();
    expect(screen.getByText("91%")).toBeTruthy();
    expect(screen.queryByText(/安全・事故・規制/)).toBeNull();
    expect(
      screen.getByRole("button", { name: /候補1/ }).getAttribute("data-layout"),
    ).toBe("subgrid");
  });

  it("hoverで候補を選択し、離れると解除する", () => {
    const handleSelect = vi.fn();
    render(
      <OptimizationSuggestions
        candidates={[
          {
            id: "candidate-1",
            query: "AI リスク 安全対策 国際比較",
            coverageScore: 0.91,
            coverageExplanation: "安全対策と比較観点を追加",
            addedAspects: ["安全対策", "国際比較"],
            improvementReason: "曖昧さの解消",
            suggestedFollowups: ["各国の規制"],
          },
          {
            id: "candidate-2",
            query: "AI 事故 重大事例",
            coverageScore: 0.78,
            coverageExplanation: "事故観点を補強",
            addedAspects: ["事故事例"],
            improvementReason: "事故の具体性を付与",
            suggestedFollowups: ["事故統計"],
          },
        ]}
        onSelect={handleSelect}
      />,
    );

    const firstCandidate = screen.getByRole("button", { name: /候補1/ });

    fireEvent.mouseEnter(firstCandidate);
    expect(handleSelect).toHaveBeenLastCalledWith("candidate-1");

    fireEvent.mouseLeave(firstCandidate);
    expect(handleSelect).toHaveBeenLastCalledWith(null);
  });

  it("クリックでリサーチ開始コールバックを呼び出す", () => {
    const handleStartResearch = vi.fn();
    render(
      <OptimizationSuggestions
        candidates={[
          {
            id: "candidate-1",
            query: "AI リスク 安全対策 国際比較",
            coverageScore: 0.91,
            coverageExplanation: "安全対策と比較観点を追加",
            addedAspects: ["安全対策", "国際比較"],
            improvementReason: "曖昧さの解消",
            suggestedFollowups: ["各国の規制"],
          },
        ]}
        onStartResearch={handleStartResearch}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /候補1/ }));

    expect(handleStartResearch).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "candidate-1",
        query: "AI リスク 安全対策 国際比較",
      }),
    );
  });
});
