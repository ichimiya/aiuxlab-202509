import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// orval APIをモック
vi.mock("@/shared/api/generated/api", () => ({
  optimizeQuery: vi.fn(async () => {
    return Promise.resolve({
      optimizedQuery: "AIの潜在的リスクと安全対策の包括的評価",
      addedAspects: ["規制動向", "事故事例"],
      improvementReason: "曖昧さの解消と具体性の付与",
      confidence: 0.92,
      suggestedFollowups: ["国際比較"],
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
  it("mutateで最適化結果を取得できる", async () => {
    const { result } = renderHook(() => useQueryOptimization(), { wrapper });

    await act(async () => {
      await result.current.optimize({ originalQuery: "AIって危険？" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.optimizedQuery ?? "").toMatch(/安全/);
  });
});
/* @vitest-environment jsdom */
