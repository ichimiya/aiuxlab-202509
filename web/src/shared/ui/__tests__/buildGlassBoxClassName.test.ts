import { describe, expect, it } from "vitest";
import { buildGlassBoxClassName } from "../GlassBox";

const BASE =
  "rounded-xl border bg-transparent p-4 transition-colors backdrop-blur-lg";

describe("buildGlassBoxClassName", () => {
  it("ベースとなるクラスを返す", () => {
    expect(buildGlassBoxClassName()).toBe(BASE);
  });

  it("追加クラスを連結する", () => {
    expect(buildGlassBoxClassName("border-white/10 text-sm")).toBe(
      `${BASE} border-white/10 text-sm`,
    );
  });
});
