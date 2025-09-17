import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// orval APIをモック
vi.mock("@/shared/api/generated/api", () => ({
  optimizeQuery: vi.fn(async () => {
    return Promise.resolve({
      sessionId: "session-123",
      result: {
        candidates: [
          {
            id: "candidate-1",
            query: "AI リスク 安全対策 国際比較",
            coverageScore: 0.91,
            coverageExplanation: "安全対策と比較観点を追加",
            addedAspects: ["安全対策", "国際比較"],
            improvementReason: "曖昧さの解消と具体化",
            suggestedFollowups: ["各国の規制"],
          },
          {
            id: "candidate-2",
            query: "AI 事故 重大事例",
            coverageScore: 0.78,
            coverageExplanation: "事故観点を追加",
            addedAspects: ["事故事例"],
            improvementReason: "事故事例の強調",
            suggestedFollowups: ["事故統計"],
          },
          {
            id: "candidate-3",
            query: "AI リスク 法規制 対策",
            coverageScore: 0.73,
            coverageExplanation: "法規制の補強",
            addedAspects: ["法規制"],
            improvementReason: "規制観点の明示",
            suggestedFollowups: ["国際標準"],
          },
        ],
        evaluationSummary: "安全・事故・規制の3観点を補強",
        recommendedCandidateId: "candidate-1",
      },
    });
  }),
}));

import { useQueryOptimization } from "./useQueryOptimization";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe("useQueryOptimization", () => {
  it("mutateで候補3件と推奨IDを取得できる", async () => {
    const { result } = renderHook(() => useQueryOptimization(), { wrapper });

    await act(async () => {
      await result.current.optimize({ originalQuery: "AIって危険？" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sessionId).toBe("session-123");
    expect(result.current.data?.result.candidates?.length).toBe(3);
    expect(result.current.data?.result.recommendedCandidateId).toBe(
      "candidate-1",
    );
    expect(
      result.current.data?.result.candidates?.[0]?.coverageScore ?? 0,
    ).toBeGreaterThan(0.8);
  });
});
/* @vitest-environment jsdom */
