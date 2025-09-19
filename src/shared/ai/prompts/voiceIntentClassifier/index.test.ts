import { describe, it, expect } from "vitest";
import { buildVoiceIntentClassifierPrompt } from "./index";
import requestSchema from "./request.json";
import responseSchema from "./response.json";

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

    expect(prompt.system).toContain("### 入力スキーマ");
    expect(prompt.system).toContain(JSON.stringify(requestSchema, null, 2));

    const responseSchemaString = JSON.stringify(responseSchema, null, 2);
    expect(prompt.system).toContain(
      responseSchemaString.replace(/^{\n|\n}$/g, ""),
    );
    expect(prompt.system).toContain("厳密なJSONのみを1つ返す");

    expect(() => JSON.parse(prompt.user)).not.toThrow();
  });

  it("Intent IDのenumが定数から生成される", () => {
    const prompt = buildVoiceIntentClassifierPrompt(baseInput);

    JSON.parse(JSON.stringify(responseSchema)).properties.intentId.enum.forEach(
      (intentId: string) => {
        expect(prompt.system).toContain(intentId);
      },
    );
  });
});
