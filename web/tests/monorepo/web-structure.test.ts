import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("monorepo structure", () => {
  it("プロジェクトの Next.js アプリが web ディレクトリに存在する", () => {
    const cwd = process.cwd();
    const candidates = [
      join(cwd, "web", "package.json"),
      join(cwd, "package.json"),
    ];
    const manifestPath = candidates.find((path) => existsSync(path));
    expect(manifestPath).toBeDefined();
    const manifest = JSON.parse(readFileSync(manifestPath!, "utf-8"));
    expect(manifest.name).toBe("web");
  });
});
