import { describe, it, expect, vi } from "vitest";
import { temporalContext, expansionPolicy, jsonSchema } from "./utils";

describe("@/shared/ai/prompts/utils", () => {
  it("temporalContext が現在年や日付を含む", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-07T00:00:00Z"));
    const s = temporalContext();
    expect(s).toContain("### TEMPORAL_CONTEXT");
    expect(s).toContain("CURRENT_YEAR: 2025");
    expect(s).toContain("RECENT_RANGE: 2023–2025");
    vi.useRealTimers();
  });

  it("expansionPolicy(minimal) が過剰拡張の抑制を指示", () => {
    const s = expansionPolicy("minimal" as never);
    expect(s).toContain("### EXPANSION_POLICY");
    expect(s).toContain("MODE: minimal");
    expect(s).toContain("過剰な拡張を禁止");
  });

  it("jsonSchema がスキーマ行を挿入して返す", () => {
    const s = jsonSchema(['  "a": string,', '  "b": number']);
    expect(s).toContain("### OUTPUT_JSON_SCHEMA");
    expect(s).toContain('"a": string');
    expect(s).toContain('"b": number');
    expect(s).toContain("### OUTPUT_JSON_ONLY");
  });
});
