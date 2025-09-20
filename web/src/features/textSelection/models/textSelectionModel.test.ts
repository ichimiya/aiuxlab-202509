import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { textSelectionModel } from "./textSelectionModel";

describe("textSelectionModel", () => {
  it("validateSelection: 空白のみは無効、1文字以上は有効", () => {
    expect(textSelectionModel.validateSelection("").isValid).toBe(false);
    expect(textSelectionModel.validateSelection("   \n\t  ").isValid).toBe(
      false,
    );
    expect(textSelectionModel.validateSelection("a").isValid).toBe(true);
    expect(textSelectionModel.validateSelection("ab").isValid).toBe(true);
  });

  it("validateSelection: 3000文字以下は有効、3001文字は無効", () => {
    const ok = "a".repeat(3000);
    const ng = "a".repeat(3001);
    expect(textSelectionModel.validateSelection(ok).isValid).toBe(true);
    expect(textSelectionModel.validateSelection(ng).isValid).toBe(false);
  });

  it("calculateSelectionMetadata: 言語とタイプ推定", () => {
    const dom = new JSDOM("<p>Hello world.</p>");
    const sel = dom.window.getSelection()!;
    const range = dom.window.document.createRange();
    const p = dom.window.document.querySelector("p")!;
    range.selectNodeContents(p);
    sel.removeAllRanges();
    sel.addRange(range);

    const meta = textSelectionModel.calculateSelectionMetadata(sel);
    expect(meta.language).toBe("en");
    expect(meta.wordCount).toBeGreaterThan(0);
  });

  it("extractContext: 選択周辺の文脈を抽出", () => {
    const html =
      "<div><p>今日はとても良い天気です。散歩に行きたい。[選択]桜が綺麗です。</p></div>";
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const p = doc.querySelector("p")!;
    const textNode = p.firstChild!; // テキストノード
    const index = (textNode.textContent || "").indexOf("[選択]");

    const range = doc.createRange();
    range.setStart(textNode, index + 1);
    range.setEnd(textNode, index + 3);

    const context = textSelectionModel.extractContext(range, 10);
    expect(context).toContain("選択");
  });
});
