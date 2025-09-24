/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTextSelectionProviderViewModel } from "./useTextSelectionProviderViewModel";
import { useResearchStore } from "@/shared/stores/researchStore";

function setupAllowedScope(text = "AI規制の最新動向") {
  const scope = document.createElement("div");
  scope.setAttribute("data-selection-scope", "research-results");
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  scope.appendChild(paragraph);
  document.body.appendChild(scope);
  return { scope, textNode: paragraph.firstChild as Text };
}

function applySelection(
  startNode: Text,
  startOffset: number,
  endNode: Text,
  endOffset: number,
) {
  const selection = window.getSelection();
  if (!selection) throw new Error("selection unavailable");
  selection.removeAllRanges();
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection.addRange(range);
  return selection;
}

describe("useTextSelectionProviderViewModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    );
    useResearchStore.getState().reset();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("許可された領域内の選択を検知し、構造情報付きでストアへ反映する", () => {
    const scope = document.createElement("div");
    scope.setAttribute("data-selection-scope", "research-results");

    const article = document.createElement("article");
    article.setAttribute("data-result-id", "result-001");

    const section = document.createElement("section");
    section.id = "section-overview";

    const heading = document.createElement("h2");
    heading.textContent = "市場規模と成長率";
    section.appendChild(heading);

    const paragraph = document.createElement("p");
    paragraph.id = "paragraph-growth";
    paragraph.textContent =
      "2024年以降、生成AIスタートアップへの投資額が再加速している。";
    section.appendChild(paragraph);

    article.appendChild(section);
    scope.appendChild(article);
    document.body.appendChild(scope);

    const selectionText =
      "2024年以降、生成AIスタートアップへの投資額が再加速している";
    applySelection(
      paragraph.firstChild as Text,
      0,
      paragraph.firstChild as Text,
      selectionText.length,
    );

    const { result } = renderHook(() => useTextSelectionProviderViewModel());

    act(() => {
      result.current.updateSelection();
      vi.advanceTimersByTime(150);
    });

    const stored = useResearchStore.getState().textSelection;
    expect(stored?.text).toBe(selectionText);
    expect(stored?.origin?.resultId).toBe("result-001");
    expect(stored?.origin?.nodeId).toBe("paragraph-growth");
    expect(stored?.section?.heading).toBe("市場規模と成長率");
    expect(stored?.section?.summary).toContain("市場規模と成長率");
  });

  it("許可領域外の選択は無視する", () => {
    const { textNode: allowedText } = setupAllowedScope();
    const { result } = renderHook(() => useTextSelectionProviderViewModel());

    act(() => {
      applySelection(allowedText, 0, allowedText, 4);
      result.current.updateSelection();
      vi.advanceTimersByTime(150);
    });

    const initialSelection = useResearchStore.getState().textSelection;
    expect(initialSelection?.text).toBe("AI規制");

    const container = document.createElement("div");
    const paragraph = document.createElement("p");
    paragraph.textContent = "別領域";
    container.appendChild(paragraph);
    document.body.appendChild(container);

    act(() => {
      applySelection(
        paragraph.firstChild as Text,
        0,
        paragraph.firstChild as Text,
        2,
      );
      result.current.updateSelection();
      vi.advanceTimersByTime(150);
    });

    expect(useResearchStore.getState().textSelection?.text).toBe("AI規制");
  });

  it("選択が折りたたまれても既存の選択を維持する", () => {
    const { textNode } = setupAllowedScope();
    applySelection(textNode, 0, textNode, 4);
    const { result } = renderHook(() => useTextSelectionProviderViewModel());

    act(() => {
      result.current.updateSelection();
      vi.advanceTimersByTime(150);
    });

    expect(useResearchStore.getState().textSelection?.text).toBe("AI規制");

    const selection = window.getSelection();
    selection?.removeAllRanges();
    const collapsedRange = document.createRange();
    collapsedRange.setStart(textNode, 0);
    collapsedRange.collapse(true);
    selection?.addRange(collapsedRange);

    act(() => {
      result.current.updateSelection();
      vi.advanceTimersByTime(150);
    });

    expect(useResearchStore.getState().textSelection?.text).toBe("AI規制");
  });
});
