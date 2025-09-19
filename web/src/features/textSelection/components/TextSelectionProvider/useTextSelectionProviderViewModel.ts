"use client";

import { useCallback, useMemo, useRef } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import textSelectionModel from "@/features/textSelection/models/textSelectionModel";
import { useDebouncedCallback } from "use-debounce";

export interface TextSelectionProviderViewModel {
  // State
  hasSelection: boolean;
  selectedText: string;
  // Actions
  updateSelection: () => void;
  clearSelection: () => void;
}

export function useTextSelectionProviderViewModel(): TextSelectionProviderViewModel {
  const selectedText = useResearchStore((s) => s.selectedText);
  const setTextSelection = useResearchStore((s) => s.setTextSelection);
  const clearTextSelection = useResearchStore((s) => s.clearTextSelection);
  const isProcessingRef = useRef(false);

  const processSelection = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        clearTextSelection();
        return;
      }

      const rawRange = sel.getRangeAt(0);
      if (rawRange.collapsed) {
        clearTextSelection();
        return;
      }

      const selected = sel.toString().trim();
      const validation = textSelectionModel.validateSelection(selected);
      if (!validation.isValid) {
        clearTextSelection();
        return;
      }

      const range = textSelectionModel.normalizeSelectionBoundary(rawRange);
      const context = textSelectionModel.extractContext(range, 200);
      const metadataBase = textSelectionModel.calculateSelectionMetadata(sel);

      const now = new Date().toISOString();
      const url =
        typeof window !== "undefined" ? window.location.href : undefined;
      const title =
        typeof document !== "undefined" ? document.title : undefined;

      setTextSelection({
        text: selected,
        context,
        metadata: {
          ...metadataBase,
          url,
          title,
          timestamp: now,
        },
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [setTextSelection, clearTextSelection]);

  const updateSelection = useDebouncedCallback(() => {
    // selectionchange の連発を抑えつつ、フレーム確定後に処理
    requestAnimationFrame(processSelection);
  }, 120);

  const clearSelection = useCallback(() => {
    clearTextSelection();
  }, [clearTextSelection]);

  const hasSelection = useMemo(() => selectedText.length > 0, [selectedText]);

  return {
    hasSelection,
    selectedText,
    updateSelection,
    clearSelection,
  };
}
