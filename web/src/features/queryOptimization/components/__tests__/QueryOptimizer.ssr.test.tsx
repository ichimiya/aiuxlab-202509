import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { QueryOptimizer } from "../QueryOptimizer";

vi.mock("@/features/voiceRecognition/hooks/useVoiceSSE", () => ({
  useVoiceSSE: vi.fn(),
}));

vi.mock("@/features/voiceRecognition/components/VoiceSessionHUD", () => ({
  VoiceSessionHUD: () => React.createElement("div"),
}));

vi.mock(
  "@/features/voiceRecognition/components/VoiceRecognitionButton",
  () => ({
    VoiceRecognitionButton: () => React.createElement("button"),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("QueryOptimizer", () => {
  test("SSRで無限ループを起こさずにレンダーできる", () => {
    const render = () => renderToString(<QueryOptimizer />);

    expect(render).not.toThrow();
  });
});
