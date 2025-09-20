/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryOptimizer } from "./QueryOptimizer";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

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
  });

  it("SSEから受け取ったセッション候補を表示する", () => {
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
    expect(screen.getByText("AI 安全対策を詳しく知りたい")).toBeDefined();
    expect(screen.getByText("現在の検索クエリ:")).toBeDefined();
    expect(screen.getByText("要約:")).toBeDefined();
  });

  it("エラーステートを表示する", () => {
    render(<QueryOptimizer />);

    act(() => {
      useVoiceRecognitionStore.getState().setError("音声認識エラー");
    });

    expect(screen.getByText("音声認識エラー")).toBeDefined();
  });

  it("リスニング状態に応じたステータスラベルを表示する", () => {
    render(<QueryOptimizer />);

    expect(screen.getByText("待機中")).toBeDefined();

    act(() => {
      useVoiceRecognitionStore.getState().startListening();
    });

    expect(screen.getByText("音声認識中...")).toBeDefined();
  });
});
