import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryOptimizer } from "../QueryOptimizer";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";
import { voiceRecognitionSelector } from "../useVoiceRecognitionControls";

vi.mock("../hooks/useQueryOptimization", () => ({
  useQueryOptimization: () => ({
    optimize: vi.fn().mockResolvedValue({
      sessionId: "session-test",
      result: {
        candidates: [],
        recommendedCandidateId: null,
        evaluationSummary: null,
      },
    }),
    data: null,
    error: null,
    isIdle: true,
    isPending: false,
    isError: false,
    isSuccess: false,
    status: "idle" as const,
    reset: vi.fn(),
  }),
}));

vi.mock("@/shared/useCases/ProcessVoiceCommandUseCase/factory", () => ({
  createProcessVoiceCommandUseCase: () => ({
    processRealTimeAudio: vi.fn(),
    stopProcessing: vi.fn(),
  }),
}));

vi.mock("@/features/voiceRecognition/hooks/useVoiceSSE", () => ({
  useVoiceSSE: vi.fn(),
}));

vi.mock("@/features/voiceRecognition/components/VoiceSessionHUD", () => ({
  VoiceSessionHUD: () => React.createElement("div"),
}));

describe("QueryOptimizer", () => {
  test("音声認識ストアセレクタは同一状態から同じ参照を返す", () => {
    const baseState = useVoiceRecognitionStore.getState();
    const first = voiceRecognitionSelector(baseState);
    const second = voiceRecognitionSelector(baseState);

    expect(second).toBe(first);
  });

  test("SSRで無限ループを起こさずにレンダーできる", () => {
    const queryClient = new QueryClient();
    const render = () =>
      renderToString(
        <QueryClientProvider client={queryClient}>
          <QueryOptimizer />
        </QueryClientProvider>,
      );

    expect(render).not.toThrow();
  });
});
