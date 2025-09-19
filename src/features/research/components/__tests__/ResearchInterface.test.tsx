// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResearchInterface } from "../ResearchInterface";

const pushMock = vi.fn();
const setCurrentResearchIdMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/shared/stores/researchStore", () => ({
  useResearchStore: () => ({
    selectedText: "selected text",
    voiceCommand: "deepdive",
    voiceTranscript: "user said deep dive",
    setCurrentResearchId: setCurrentResearchIdMock,
  }),
}));

vi.mock(
  "@/features/voiceRecognition/components/VoiceRecognitionButton",
  () => ({
    VoiceRecognitionButton: () => <button type="button">音声</button>,
  }),
);

vi.mock("@/features/voiceRecognition/components/VoiceStatusIndicator", () => ({
  VoiceStatusIndicator: () => <div data-testid="voice-status" />,
}));

vi.mock("@/features/voiceRecognition/components/VoiceLevelMeter", () => ({
  VoiceLevelMeter: () => <div data-testid="voice-level" />,
}));

vi.mock("@/features/voiceRecognition/components/VoiceCommandHistory", () => ({
  VoiceCommandHistory: () => <div data-testid="voice-history" />,
}));

describe("ResearchInterface", () => {
  beforeEach(() => {
    pushMock.mockReset();
    setCurrentResearchIdMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "research-uuid",
        status: "pending",
        revision: 1,
        createdAt: "2025-09-18T10:00:00.000Z",
        updatedAt: "2025-09-18T10:00:00.000Z",
      }),
    });
  });

  it("POST /api/research を呼び出して詳細画面へ遷移する", async () => {
    render(<ResearchInterface />);

    const input = screen.getByLabelText("リサーチクエリ");
    fireEvent.change(input, { target: { value: "Redis Streams" } });

    fireEvent.click(screen.getByRole("button", { name: "リサーチ開始" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "Redis Streams",
          selectedText: "selected text",
          voiceCommand: "deepdive",
          voiceTranscript: "user said deep dive",
        }),
      });
    });

    expect(setCurrentResearchIdMock).toHaveBeenCalledWith("research-uuid");
    expect(pushMock).toHaveBeenCalledWith("/research/research-uuid");
  });

  it("エラー時にメッセージを表示する", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    render(<ResearchInterface />);

    const input = screen.getByLabelText("リサーチクエリ");
    fireEvent.change(input, { target: { value: "Redis Streams" } });

    fireEvent.click(screen.getByRole("button", { name: "リサーチ開始" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(
      screen.getByText(
        "リサーチの開始に失敗しました。時間をおいて再試行してください。",
      ),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
