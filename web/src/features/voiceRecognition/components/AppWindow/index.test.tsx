/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { AppWindow } from "./index";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

const handleToggleListeningMock = vi.fn();

vi.mock("../VoiceRecognitionButton/useVoiceRecognitionButtonViewModel", () => ({
  useVoiceRecognitionButtonViewModel: () => ({
    handleToggleListening: handleToggleListeningMock,
    isSupported: true,
    hasPermission: true,
    requestPermission: vi.fn(),
    buttonState: {
      text: "音声認識開始",
      className: "mock-btn",
      isDisabled: false,
      showIcon: false,
    },
  }),
}));

describe("AppWindow logo button", () => {
  beforeEach(() => {
    handleToggleListeningMock.mockReset();
    useVoiceRecognitionStore.getState().reset();
  });

  afterEach(() => {
    useVoiceRecognitionStore.getState().reset();
  });

  it("クリックでtoggleハンドラを呼び出す", async () => {
    const { getByRole } = render(
      <AppWindow>
        <div>child</div>
      </AppWindow>,
    );

    const button = getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(handleToggleListeningMock).toHaveBeenCalledTimes(1);
  });

  it("遷移中ステータスではボタンを無効化する", () => {
    act(() => {
      useVoiceRecognitionStore.getState().setListeningStatus("starting");
    });

    const { getByRole } = render(
      <AppWindow>
        <div>child</div>
      </AppWindow>,
    );

    expect(getByRole("button")).toBeDisabled();
  });

  it("リスニング状態に応じてロゴのフィルターが変わる", () => {
    const { getByAltText } = render(
      <AppWindow>
        <div>child</div>
      </AppWindow>,
    );

    const logo = getByAltText("NOVA logo");
    expect(logo).toHaveStyle({ filter: "grayscale(100%)" });

    act(() => {
      useVoiceRecognitionStore.getState().startListening();
    });

    expect(logo).toHaveStyle({ filter: "grayscale(0%)" });
  });

  it("状態に応じてコンテナサイズが切り替わる", () => {
    const { getByTestId } = render(
      <AppWindow data-testid="app-window">
        <div>child</div>
      </AppWindow>,
    );

    const container = getByTestId("app-window");
    expect(container).toHaveStyle({ width: "300px", height: "85px" });

    act(() => {
      useVoiceRecognitionStore.getState().setListeningStatus("starting");
    });
    expect(container).toHaveStyle({
      width: "max(60vw, 600px)",
      height: "max(30vh, 300px)",
    });

    act(() => {
      useVoiceRecognitionStore.getState().setSessionState({
        sessionId: "session-1",
        status: "researching",
        candidates: [],
        lastUpdatedAt: new Date().toISOString(),
      });
    });
    expect(container).toHaveStyle({
      width: "max(90vw, 1024px)",
      height: "max(90vh, 768px)",
    });
  });
});
