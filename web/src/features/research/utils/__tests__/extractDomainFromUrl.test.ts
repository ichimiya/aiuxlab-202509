import { describe, it, expect } from "vitest";
import { extractDomainFromUrl } from "../extractDomainFromUrl";

describe("extractDomainFromUrl", () => {
  it("プロトコル付きURLからドメインを取り出す", () => {
    expect(extractDomainFromUrl("https://example.com/path?q=1")).toBe(
      "example.com",
    );
  });

  it("wwwプレフィックスを取り除いたドメインを返す", () => {
    expect(extractDomainFromUrl("https://www.example.co.jp")).toBe(
      "example.co.jp",
    );
  });

  it("不正なURLの場合はnullを返す", () => {
    expect(extractDomainFromUrl("not-a-url")).toBeNull();
  });
});
