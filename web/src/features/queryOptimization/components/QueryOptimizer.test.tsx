/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { QueryOptimizer } from "./QueryOptimizer";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

const pushMock = vi.fn();
const setCurrentResearchIdMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/shared/stores/researchStore", () => ({
  useResearchStore: (selector?: (state: any) => any) => {
    const state = {
      selectedText: "selected text",
      voiceCommand: "optimize research",
      voiceTranscript: "optimize research",
      setCurrentResearchId: setCurrentResearchIdMock,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/features/voiceRecognition/hooks/useVoiceSSE", () => ({
  useVoiceSSE: () => ({ reconnectAttempt: 0 }),
}));

vi.mock(
  "@/features/voiceRecognition/components/VoiceRecognitionButton",
  () => ({
    VoiceRecognitionButton: () => <button type="button">音声認識トグル</button>,
  }),
);

describe("QueryOptimizer", () => {
  beforeEach(() => {
    useVoiceRecognitionStore.getState().reset();
    pushMock.mockReset();
    setCurrentResearchIdMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "research-uuid" }),
    });
  });

  it("候補リストを表示し、それ以外の情報は表示しない", () => {
    render(<QueryOptimizer />);

    act(() => {
      useVoiceRecognitionStore.getState().setSessionState({
        sessionId: "session-1",
        status: "ready",
        candidates: [
          {
            id: "candidate-1",
            query: "AI 安全対策 重大事例",
            coverageScore: 0.92,
            coverageExplanation: "安全対策と事故事例を補強",
            addedAspects: ["安全対策", "事故事例"],
            improvementReason: "曖昧さを解消",
            suggestedFollowups: ["各国の規制"],
            rank: 1,
            source: "llm",
          },
        ],
        selectedCandidateId: "candidate-1",
        lastUpdatedAt: new Date().toISOString(),
        currentQuery: "AI 安全対策",
        latestTranscript: "AI 安全対策を詳しく知りたい",
        evaluationSummary: "安全面を補強",
      });
    });

    expect(screen.getByText("AI 安全対策 重大事例")).toBeDefined();
    expect(screen.queryByText("AI 安全対策を詳しく知りたい")).toBeNull();
    expect(screen.queryByText("現在の検索クエリ:")).toBeNull();
    expect(screen.queryByText("要約:")).toBeNull();
    expect(screen.queryByText("音声認識トグル")).toBeNull();
  });

  it("エラー状態でもリスト以外は表示しない", () => {
    render(<QueryOptimizer />);

    act(() => {
      useVoiceRecognitionStore.getState().setError("音声認識エラー");
    });

    expect(screen.queryByText("音声認識エラー")).toBeNull();
  });

  it("カードクリックでリサーチを開始し詳細画面へ遷移する", async () => {
    render(<QueryOptimizer />);

    act(() => {
      useVoiceRecognitionStore.getState().setSessionState({
        sessionId: "session-1",
        status: "ready",
        candidates: [
          {
            id: "candidate-1",
            query: "AI 安全対策 重大事例",
            coverageScore: 0.92,
            coverageExplanation: "安全対策と事故事例を補強",
            addedAspects: ["安全対策", "事故事例"],
            improvementReason: "曖昧さを解消",
            suggestedFollowups: ["各国の規制"],
            rank: 1,
            source: "llm",
          },
        ],
        selectedCandidateId: "candidate-1",
        lastUpdatedAt: new Date().toISOString(),
        currentQuery: "AI 安全対策",
        latestTranscript: "AI 安全対策を詳しく知りたい",
      });
    });

    const candidateButton = screen.getByRole("button", { name: /候補1/ });
    fireEvent.click(candidateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "AI 安全対策 重大事例",
          selectedText: "selected text",
          voiceCommand: "optimize research",
          voiceTranscript: "optimize research",
        }),
      });
    });

    expect(setCurrentResearchIdMock).toHaveBeenCalledWith("research-uuid");
    expect(pushMock).toHaveBeenCalledWith("/research/research-uuid");
  });
});
