import { describe, expect, it } from "vitest";

import { getResearchContentClassName } from "../getResearchContentClassName";

describe("getResearchContentClassName", () => {
  it("研究詳細HTML用のタイポグラフィクラスを返す", () => {
    const className = getResearchContentClassName();

    expect(className).toContain("prose");
    expect(className).toContain("prose-invert");
    expect(className).toContain("max-w-none");
    expect(className).toContain("leading-relaxed");
    expect(className).toContain("prose-headings:font-semibold");
    expect(className).toContain("prose-headings:text-sky-200");
    expect(className).toContain("prose-a:text-sky-300");
  });
});
