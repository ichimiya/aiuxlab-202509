/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVoiceCommandHistoryViewModel } from "./useVoiceCommandHistoryViewModel";
import { useResearchStore } from "@/shared/stores/researchStore";

function recordCommand({
  id,
  text,
  pattern,
  confidence,
  timestamp,
}: {
  id: string;
  text: string;
  pattern: string;
  confidence: number;
  timestamp: Date;
}) {
  const { recordVoiceCommandResult } = useResearchStore.getState() as any;
  recordVoiceCommandResult({
    id,
    originalText: text,
    recognizedPattern: pattern,
    confidence,
    timestamp,
    displayText: text,
  });
}

describe("useVoiceCommandHistoryViewModel", () => {
  beforeEach(() => {
    useResearchStore.getState().reset();
  });

  it("履歴がない場合は非表示", () => {
    const { result } = renderHook(() => useVoiceCommandHistoryViewModel());

    expect(result.current.hasCommands).toBe(false);
    expect(result.current.displayCommands).toHaveLength(0);
  });

  it("ストアの履歴を新しい順で整形する", () => {
    recordCommand({
      id: "voice-100",
      text: "AIリスクを深掘りして",
      pattern: "deepdive",
      confidence: 0.84,
      timestamp: new Date("2025-09-17T09:58:00.000Z"),
    });

    recordCommand({
      id: "voice-101",
      text: "最新の法規制を教えて",
      pattern: "summary",
      confidence: 0.66,
      timestamp: new Date("2025-09-17T10:00:30.000Z"),
    });

    const { result } = renderHook(() => useVoiceCommandHistoryViewModel());

    expect(result.current.hasCommands).toBe(true);
    expect(result.current.displayCommands).toHaveLength(2);
    expect(result.current.displayCommands[0]).toMatchObject({
      id: "voice-101",
      displayText: "最新の法規制を教えて",
      recognizedPattern: "summary",
      confidence: 0.66,
    });
    expect(result.current.displayCommands[1]).toMatchObject({
      id: "voice-100",
      recognizedPattern: "deepdive",
    });

    const expectedTime = new Date(
      "2025-09-17T10:00:30.000Z",
    ).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    expect(result.current.displayCommands[0]?.formattedTime).toBe(expectedTime);
  });
});
