import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// NOTE: 依存禁止テスト（回帰防止）。
// '@/shared/infrastructure/external/bedrock' バレル経由のimportを禁止する。

function readFiles() {
  // node:fs does not provide glob directly; emulate via bash-like pattern using small util
  // To avoid extra deps, scan src recursively.
  const results: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) results.push(p);
    }
  }
  walk("src");
  return results;
}

describe("arch: no bedrock barrel imports", () => {
  it("should not import from '@/shared/infrastructure/external/bedrock'", () => {
    const files = readFiles();
    const offenders: string[] = [];
    const pattern = /from\s+"@\/shared\/infrastructure\/external\/bedrock"/;
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      if (pattern.test(text)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
