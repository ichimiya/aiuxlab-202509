import { describe, it, expect } from "vitest";
import { formatReferenceLabel } from "../formatReferenceLabel";

describe("formatReferenceLabel", () => {
  it("0基準のインデックスを3桁のREF表記に変換する", () => {
    expect(formatReferenceLabel(0)).toBe("REF. 001");
    expect(formatReferenceLabel(8)).toBe("REF. 009");
    expect(formatReferenceLabel(42)).toBe("REF. 043");
  });

  it("負の入力はREF. 001に丸める", () => {
    expect(formatReferenceLabel(-3)).toBe("REF. 001");
  });
});
