import { describe, it, expect } from "vitest";
import { normalizeVoiceIntentClassification } from "./voiceIntentClassifierAdapter";

describe("normalizeVoiceIntentClassification", () => {
  it("パラメータが省略されたレスポンスを正規化する", () => {
    const result = normalizeVoiceIntentClassification({
      intentId: "optimize_query_append",
      confidence: 0.72,
    });

    expect(result).toEqual({
      intentId: "OPTIMIZE_QUERY_APPEND",
      confidence: 0.72,
      parameters: {},
    });
  });

  it("信頼度を0-1にクランプし、異常なparametersを初期化する", () => {
    const result = normalizeVoiceIntentClassification({
      intentId: "START_RESEARCH",
      confidence: 1.4,
      parameters: null,
    });

    expect(result).toEqual({
      intentId: "START_RESEARCH",
      confidence: 1,
      parameters: {},
    });
  });

  it("必要フィールドが欠けている場合はエラーにする", () => {
    expect(() =>
      normalizeVoiceIntentClassification({
        confidence: 0.5,
      }),
    ).toThrow(/intentId/i);

    expect(() =>
      normalizeVoiceIntentClassification({
        intentId: "START_RESEARCH",
      }),
    ).toThrow(/confidence/i);
  });

  it("未知のintentIdはエラーにする", () => {
    expect(() =>
      normalizeVoiceIntentClassification({
        intentId: "UNKNOWN_INTENT",
        confidence: 0.5,
      }),
    ).toThrow(/Unsupported intentId/i);
  });
});
