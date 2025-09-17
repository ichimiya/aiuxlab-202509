/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";

const optimizeMock = vi.fn();
const processRealTimeAudioMock = vi.fn();
const stopProcessingMock = vi.fn();
const useSseMock = vi.fn(() => ({ reconnectAttempt: 0 }));

vi.mock("../hooks/useQueryOptimization", () => ({
  useQueryOptimization: () => ({
    optimize: optimizeMock,
  }),
}));

vi.mock("@/shared/useCases/ProcessVoiceCommandUseCase/factory", () => ({
  createProcessVoiceCommandUseCase: () => ({
    processRealTimeAudio: processRealTimeAudioMock,
    stopProcessing: stopProcessingMock,
    isProcessing: false,
  }),
}));

vi.mock("@/features/voiceRecognition/hooks/useVoiceSSE", () => ({
  useVoiceSSE: () => useSseMock(),
}));

import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

import { QueryOptimizer } from "./QueryOptimizer";

describe("QueryOptimizer", () => {
  beforeEach(() => {
    optimizeMock.mockReset();
    processRealTimeAudioMock.mockReset();
    stopProcessingMock.mockReset();
    stopProcessingMock.mockResolvedValue(undefined);
    useVoiceRecognitionStore.getState().reset();
    useSseMock.mockClear();
  });

  const mockCandidates = [
    {
      id: "candidate-1",
      query: "AI 安全対策 重大事例",
      coverageScore: 0.92,
      coverageExplanation: "安全対策と事故事例を補強",
      addedAspects: ["安全対策", "事故事例"],
      improvementReason: "曖昧さを解消",
      suggestedFollowups: ["各国の規制"],
    },
    {
      id: "candidate-2",
      query: "AI リスク 法規制 比較",
      coverageScore: 0.81,
      coverageExplanation: "法規制の観点を追加",
      addedAspects: ["法規制"],
      improvementReason: "規制比較を明確化",
      suggestedFollowups: ["国際標準"],
    },
    {
      id: "candidate-3",
      query: "AI 安全対策 実務ガイド",
      coverageScore: 0.74,
      coverageExplanation: "実務への適用に焦点",
      addedAspects: ["実務ガイド"],
      improvementReason: "実践的な観点を追加",
      suggestedFollowups: ["導入事例"],
    },
  ];

  const setupOptimizationMock = () => {
    optimizeMock.mockResolvedValueOnce({
      sessionId: "session-123",
      result: {
        candidates: mockCandidates,
        evaluationSummary: "安全・規制・実務の3軸で補強",
        recommendedCandidateId: "candidate-1",
      },
    });
  };

  const runVoiceFlow = async (
    transcript: string,
    options: { pattern?: string | null } = {},
  ) => {
    let voiceCallback:
      | ((result: {
          originalText: string;
          pattern: string | null;
          confidence: number;
          alternatives?: Array<{ transcript: string; confidence: number }>;
          isPartial?: boolean;
        }) => void)
      | undefined;

    processRealTimeAudioMock.mockImplementationOnce(async (cb) => {
      voiceCallback = cb;
    });

    const voiceButton = screen.getByRole("button", { name: "音声で最適化" });
    fireEvent.click(voiceButton);

    expect(processRealTimeAudioMock).toHaveBeenCalled();
    expect(screen.getByText("音声認識中...")).toBeTruthy();

    act(() => {
      voiceCallback?.({
        originalText: transcript.slice(0, 5),
        pattern: options.pattern ?? null,
        confidence: 0.6,
        isPartial: true,
      });
    });
    expect(screen.getByText("文字起こし中...")).toBeTruthy();

    await act(async () => {
      voiceCallback?.({
        originalText: transcript,
        pattern: options.pattern ?? "deepdive",
        confidence: 0.92,
        isPartial: false,
      });
    });
  };

  it("音声認識完了で自動的に最適化を実行し、結果を表示する", async () => {
    setupOptimizationMock();
    render(<QueryOptimizer />);

    const transcript = "AIの安全対策を詳しく";
    await runVoiceFlow(transcript);

    expect(optimizeMock).toHaveBeenCalledWith({
      originalQuery: transcript,
      voiceCommand: "deepdive",
      voiceTranscript: transcript,
    });

    const storeState = useVoiceRecognitionStore.getState();
    expect(storeState.sessionState?.status).toBe("ready");
    expect(storeState.sessionState?.sessionId).toBe("session-123");

    await waitFor(() => {
      expect(screen.getByText("最適化完了")).toBeTruthy();
      expect(screen.getByText("AI 安全対策 重大事例")).toBeTruthy();
    });
    expect(screen.getAllByText("92%").length).toBeGreaterThan(0);
  });

  it("2回連続で音声最適化を実行できる", async () => {
    setupOptimizationMock();
    optimizeMock.mockResolvedValueOnce({
      sessionId: "session-123",
      result: {
        candidates: [
          {
            id: "candidate-1",
            query: "AI 倫理 ガバナンス 国際比較",
            coverageScore: 0.83,
            coverageExplanation: "倫理とガバナンスの観点を強化",
            addedAspects: ["倫理", "ガバナンス"],
            improvementReason: "国際比較を明確化",
            suggestedFollowups: ["各国の規制"],
          },
        ],
        evaluationSummary: "倫理・ガバナンスの観点を網羅",
        recommendedCandidateId: "candidate-1",
      },
    });

    render(<QueryOptimizer />);

    const transcript1 = "AIの安全対策を詳しく";
    await runVoiceFlow(transcript1, { pattern: "deepdive" });

    expect(optimizeMock).toHaveBeenNthCalledWith(1, {
      originalQuery: transcript1,
      voiceCommand: "deepdive",
      voiceTranscript: transcript1,
    });

    const transcript2 = "AIの倫理とガバナンス";
    await runVoiceFlow(transcript2, { pattern: "perspective" });

    expect(optimizeMock).toHaveBeenNthCalledWith(2, {
      originalQuery: transcript2,
      voiceCommand: "perspective",
      voiceTranscript: transcript2,
      sessionId: "session-123",
    });
  });
});
