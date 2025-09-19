import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createResearchRepository } from "./factory";

const ENV = { ...process.env };

describe("search/factory", () => {
  beforeEach(() => {
    process.env = { ...ENV };
  });
  afterEach(() => {
    process.env = { ...ENV };
  });

  it("既定はperplexityを選択し、search関数を提供する", () => {
    delete process.env.SEARCH_PROVIDER;
    const repo = createResearchRepository({ apiKey: "test" });
    expect(typeof (repo as { search: unknown }).search).toBe("function");
  });
});
