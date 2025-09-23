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

  it("許可された領域内の選択を検知してストアへ反映する", () => {
    const { textNode } = setupAllowedScope();
    const selectionText = "AI規制";
    applySelection(textNode, 0, textNode, selectionText.length);

    const { result } = renderHook(() => useTextSelectionProviderViewModel());

    act(() => {
      result.current.updateSelection();
      vi.advanceTimersByTime(150);
    });

    expect(useResearchStore.getState().textSelection?.text).toBe(selectionText);
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
