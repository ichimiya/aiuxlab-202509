import { describe, it, expect, vi } from "vitest";
import { temporalContext, expansionPolicy, jsonSchema } from "./middleware";

describe("middleware/temporalContext", () => {
  it("現在年と最近範囲を含む", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-06T00:00:00Z"));
    const txt = temporalContext();
    expect(txt).toContain("### TEMPORAL_CONTEXT");
    expect(txt).toContain("CURRENT_YEAR: 2025");
    expect(txt).toContain("RECENT_RANGE: 2023–2025");
    vi.useRealTimers();
  });
});

describe("middleware/expansionPolicy", () => {
  it("minimalモードの指示が含まれる", () => {
    const txt = expansionPolicy("minimal");
    expect(txt).toContain("### EXPANSION_POLICY");
    expect(txt).toContain("MODE: minimal");
    expect(txt).toContain("過剰な拡張を禁止");
  });
});

describe("middleware/jsonSchema", () => {
  it("スキーマとJSON-onlyの指示を出す", () => {
    const txt = jsonSchema([
      '  "optimizedQuery": string,',
      '  "addedAspects": string[],',
    ]);
    expect(txt).toContain("### OUTPUT_JSON_SCHEMA");
    expect(txt).toContain("optimizedQuery");
    expect(txt).toContain("### OUTPUT_JSON_ONLY");
    expect(txt).toContain("厳密なJSON");
  });
});
