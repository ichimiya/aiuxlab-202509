import { describe, it, expect } from "vitest";
import { buildVoiceIntentClassifierPrompt } from "./voiceIntentClassifier";
import { VOICE_INTENT_IDS } from "@/shared/domain/voice/intents";

const baseInput = {
  sessionId: "session-123",
  text: "リサーチを開始して",
  context: {
    confidence: 0.82,
    isFinal: true,
    metadata: { locale: "ja-JP" },
    session: null,
    history: [],
    pattern: null,
  },
};

describe("buildVoiceIntentClassifierPrompt", () => {
  it("JSON Schemaを含む出力フォーマット指示を含める", () => {
    const prompt = buildVoiceIntentClassifierPrompt(baseInput);

    expect(prompt).toContain('"$schema"');
    expect(prompt).toContain('"additionalProperties": false');
    expect(prompt).toContain("厳密なJSONのみ");
  });

  it("Intent IDのenumが定数から生成される", () => {
    const prompt = buildVoiceIntentClassifierPrompt(baseInput);

    VOICE_INTENT_IDS.forEach((intent) => {
      expect(prompt).toContain(`"${intent}"`);
    });
  });
});
