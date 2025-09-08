import { describe, it, expect } from "vitest";
import { createSpeechToTextAdapter } from "./factory";

describe("stt/factory", () => {
  it("既定はtranscribeを選択し、start/stop関数を提供する", () => {
    const stt = createSpeechToTextAdapter();
    expect(
      typeof (stt as { startRealTimeTranscription: unknown })
        .startRealTimeTranscription,
    ).toBe("function");
    expect(
      typeof (stt as { stopTranscription: unknown }).stopTranscription,
    ).toBe("function");
  });
});
