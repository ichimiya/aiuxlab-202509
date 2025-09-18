/* @vitest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, beforeEach, expect } from "vitest";
import { VoiceSessionHUD } from "./index";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

const resetStore = () => useVoiceRecognitionStore.getState().reset();

describe("VoiceSessionHUD", () => {
  beforeEach(() => {
    resetStore();
  });

  it("セッション未開始時のメッセージを表示する", () => {
    render(<VoiceSessionHUD />);

    expect(
      screen.getByText("音声セッションを開始すると進行状況が表示されます"),
    ).toBeInTheDocument();
  });

  it("セッション状態と接続ステータスを表示する", () => {
    useVoiceRecognitionStore.setState((state) => ({
      ...state,
      sessionId: "session-1",
      sessionState: {
        sessionId: "session-1",
        status: "ready",
        candidates: [],
        selectedCandidateId: undefined,
        lastUpdatedAt: "2025-09-17T04:00:00.000Z",
      },
      isSseConnected: true,
    }));

    render(<VoiceSessionHUD />);

    expect(screen.getByText("接続中")).toHaveClass("text-green-600");
    expect(screen.getByText("セッションID: session-1")).toBeInTheDocument();
    expect(screen.getByText("状態: 準備完了")).toBeInTheDocument();
  });

  it("ペンディングIntentとエラーを同時に表示する", () => {
    useVoiceRecognitionStore.setState((state) => ({
      ...state,
      sessionId: "session-2",
      sessionState: {
        sessionId: "session-2",
        status: "optimizing",
        candidates: [],
        lastUpdatedAt: "2025-09-17T04:04:00.000Z",
      },
      pendingIntent: {
        intentId: "START_RESEARCH",
        confidence: 0.72,
        parameters: { candidateId: "candidate-1" },
        expiresAt: "2025-09-17T04:05:00.000Z",
      },
      lastError: "SSE再接続中",
      reconnectAttempt: 3,
    }));

    render(<VoiceSessionHUD />);

    expect(
      screen.getByText("確認待ち: START_RESEARCH (信頼度 0.72)"),
    ).toBeInTheDocument();
    expect(screen.getByText("エラー: SSE再接続中")).toBeInTheDocument();
    expect(screen.getByText("再接続試行中 (3)")).toBeInTheDocument();
  });
});
