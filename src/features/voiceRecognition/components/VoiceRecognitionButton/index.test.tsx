/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VoiceRecognitionButton } from "./index";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

const startRealTimeMock = vi.fn().mockResolvedValue(undefined);
const stopProcessingMock = vi.fn().mockResolvedValue(undefined);
const requestPermissionMock = vi.fn().mockResolvedValue(true);
const voiceDomainServiceMock = {
  parseVoiceCommand: vi.fn(() => ({ pattern: "deepdive", confidence: 0.8 })),
};

let handlers: {
  onTranscriptionResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onConnectionStatusChange?: (status: string) => void;
} | null = null;

vi.mock("@/shared/useCases/ProcessVoiceCommandUseCase/factory", () => ({
  createProcessVoiceCommandUseCase: () => ({
    startRealTimeTranscription: startRealTimeMock,
    stopProcessing: stopProcessingMock,
    requestPermission: requestPermissionMock,
    checkSupport: vi.fn().mockReturnValue(true),
    get isProcessing() {
      return false;
    },
    setRealTimeEventHandlers: vi.fn((nextHandlers) => {
      handlers = nextHandlers;
    }),
    analyzeTranscript: voiceDomainServiceMock.parseVoiceCommand,
  }),
}));

describe("VoiceRecognitionButton", () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    handlers = null;
    startRealTimeMock.mockClear();
    stopProcessingMock.mockClear();
    requestPermissionMock.mockClear();
    voiceDomainServiceMock.parseVoiceCommand.mockClear();
    fetchMock.mockClear();
    global.fetch = fetchMock as unknown as typeof fetch;
    useVoiceRecognitionStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it("最終文字起こしを受け取ったら音声イベントAPIへ投稿する", async () => {
    render(<VoiceRecognitionButton />);

    const button = screen.getByRole("button", { name: "音声認識開始" });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(startRealTimeMock).toHaveBeenCalled();
    expect(handlers?.onTranscriptionResult).toBeDefined();

    act(() => {
      useVoiceRecognitionStore.getState().setSseConnected(true);
    });

    await act(async () => {
      handlers?.onTranscriptionResult?.("サッカーチームを調べたい", true);
      await Promise.resolve();
      vi.runAllTimers();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body ?? "{}");
    expect(requestBody.transcript).toBe("サッカーチームを調べたい");
    expect(requestBody.pattern).toBe("deepdive");
    expect(requestBody.isFinal).toBe(true);
    expect(requestBody.sessionId).toBeTruthy();
  });
});
