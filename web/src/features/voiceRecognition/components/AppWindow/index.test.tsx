/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { AppWindow } from "./index";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";
import {
  useAppWindowLayoutStore,
  phaseDimensions,
} from "@/features/voiceRecognition/stores/appWindowLayoutStore";

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
    vi.useFakeTimers();
    handleToggleListeningMock.mockReset();
    act(() => {
      useVoiceRecognitionStore.getState().reset();
      useAppWindowLayoutStore.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      vi.runAllTimers();
      useVoiceRecognitionStore.getState().reset();
      useAppWindowLayoutStore.getState().reset();
    });
    vi.useRealTimers();
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
    expect(container).toHaveStyle({
      width: phaseDimensions.idle.width,
      height: phaseDimensions.idle.height,
    });

    act(() => {
      useVoiceRecognitionStore.getState().setSessionState({
        sessionId: "session-1",
        status: "optimizing",
        candidates: [],
        lastUpdatedAt: new Date().toISOString(),
      });
    });
    expect(useAppWindowLayoutStore.getState().phase).toBe("optimizing");
    expect(container).toHaveStyle({
      width: phaseDimensions.optimizing.width,
      height: phaseDimensions.optimizing.height,
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
      width: phaseDimensions.research.width,
      height: phaseDimensions.research.height,
    });
  });

  it("ウィンドウサイズ変更中は子要素を非表示にし、完了後にフェードインする", () => {
    const { container } = render(
      <AppWindow>
        <div data-testid="app-window-content">child</div>
      </AppWindow>,
    );

    const main = container.querySelector("main");
    const getContent = () =>
      container.querySelector("[data-testid='app-window-content']");

    expect(main).not.toBeNull();
    expect(main).toHaveClass("opacity-100");
    expect(getContent()).not.toBeNull();

    act(() => {
      useAppWindowLayoutStore.getState().setPhase("optimizing");
    });

    expect(main).toHaveClass("opacity-0");
    expect(getContent()).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(main).toHaveClass("opacity-100");
    expect(getContent()).not.toBeNull();
  });

  it("ボタンをheader、子要素をmainに配置する", () => {
    const { container, getByRole } = render(
      <AppWindow>
        <div data-testid="app-window-content">child</div>
      </AppWindow>,
    );

    const header = container.querySelector("header");
    const main = container.querySelector("main");
    const button = getByRole("button");
    const content = container.querySelector(
      "[data-testid='app-window-content']",
    );

    expect(header).not.toBeNull();
    expect(main).not.toBeNull();

    if (!header || !main) {
      throw new Error("AppWindow構造の検証に失敗しました");
    }

    const headerElement = header as HTMLElement;
    const mainElement = main as HTMLElement;

    if (!content) {
      throw new Error("AppWindowの子要素が見つかりません");
    }

    expect(headerElement).toContainElement(button);
    if (!(content instanceof HTMLElement || content instanceof SVGElement)) {
      throw new Error("AppWindowの子要素がHTMLElementではありません");
    }

    expect(mainElement).toContainElement(content);

    const innerWrapper = header?.parentElement;
    const childTagNames = Array.from(innerWrapper?.children ?? []).map(
      (element) => element.tagName.toLowerCase(),
    );
    expect(childTagNames).toEqual(["header", "main"]);
  });
});
