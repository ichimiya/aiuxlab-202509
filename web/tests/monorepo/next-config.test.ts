import { resolve } from "path";

describe("next config", () => {
  it("turbopack.root が web ディレクトリを指す", async () => {
    const configModule = await import("../../next.config");
    const config =
      (configModule as { default?: unknown }).default ?? configModule;
    const expectedRoot = resolve(__dirname, "..", "..");
    expect((config as { turbopack?: { root?: string } }).turbopack?.root).toBe(
      expectedRoot,
    );
  });
});
