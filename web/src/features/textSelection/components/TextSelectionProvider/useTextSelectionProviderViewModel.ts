"use client";

import { useCallback, useMemo, useRef } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import textSelectionModel from "@/features/textSelection/models/textSelectionModel";
import { useDebouncedCallback } from "use-debounce";
import type {
  TextSelectionOrigin,
  TextSelectionSectionContext,
} from "@/shared/stores/researchStore";

export interface TextSelectionProviderViewModel {
  // State
  hasSelection: boolean;
  selectedText: string;
  // Actions
  updateSelection: () => void;
  clearSelection: () => void;
}

const SELECTION_SCOPE_SELECTOR = '[data-selection-scope="research-results"]';

function isRangeWithinAllowedScope(range: Range): boolean {
  if (typeof document === "undefined") return true;
  const scopeElements = Array.from(
    document.querySelectorAll(SELECTION_SCOPE_SELECTOR),
  );
  if (scopeElements.length === 0) return true;
  return scopeElements.some(
    (element) =>
      element.contains(range.startContainer) &&
      element.contains(range.endContainer),
  );
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
        return;
      }

      const rawRange = sel.getRangeAt(0);
      if (rawRange.collapsed) {
        return;
      }

      if (!isRangeWithinAllowedScope(rawRange)) {
        return;
      }

      const selected = sel.toString().trim();
      const validation = textSelectionModel.validateSelection(selected);
      if (!validation.isValid) {
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

      const structure = extractSelectionStructure(range);

      setTextSelection({
        text: selected,
        context,
        metadata: {
          ...metadataBase,
          url,
          title,
          timestamp: now,
        },
        origin: structure.origin,
        section: structure.section,
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [setTextSelection]);

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

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const MAX_SECTION_SUMMARY_LENGTH = 280;

function extractSelectionStructure(range: Range): {
  origin?: TextSelectionOrigin;
  section?: TextSelectionSectionContext;
} {
  if (typeof document === "undefined") {
    return {};
  }

  const baseElement = getElementFromNode(range.commonAncestorContainer);
  if (!baseElement) {
    return {};
  }

  const resultElement = baseElement.closest<HTMLElement>("[data-result-id]");
  const resultId = resultElement?.getAttribute("data-result-id") ?? undefined;

  const nodeElement = getElementFromNode(
    range.startContainer,
  )?.closest<HTMLElement>("[id]");
  const nodeId =
    nodeElement && resultElement && resultElement.contains(nodeElement)
      ? nodeElement.id || undefined
      : undefined;

  const headingText = findNearestHeading(
    nodeElement ?? baseElement,
    resultElement,
  );
  const sectionRoot =
    nodeElement ??
    baseElement.closest<HTMLElement>("section, article, div") ??
    baseElement;
  const sectionSummary = buildSectionSummary(sectionRoot, headingText);

  const origin: TextSelectionOrigin | undefined =
    nodeId || resultId ? { nodeId, resultId } : undefined;
  const section: TextSelectionSectionContext | undefined =
    headingText || sectionSummary
      ? {
          heading: headingText,
          summary: sectionSummary,
        }
      : undefined;

  return { origin, section };
}

function getElementFromNode(node: Node | null): HTMLElement | null {
  if (!node) return null;
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as HTMLElement;
  }
  return (node.parentElement as HTMLElement | null) ?? null;
}

function findNearestHeading(
  element: HTMLElement | null,
  boundary: HTMLElement | null,
): string | undefined {
  let current: HTMLElement | null = element;

  while (current) {
    if (current.matches?.(HEADING_SELECTOR)) {
      const text = sanitizeText(current.textContent);
      if (text) return text;
    }

    const headingSibling = findHeadingInSiblings(current);
    if (headingSibling) {
      return headingSibling;
    }

    if (!boundary || current === boundary) {
      break;
    }
    current = current.parentElement;
  }

  if (boundary) {
    const boundaryHeading = boundary.querySelector(HEADING_SELECTOR);
    if (boundaryHeading) {
      const text = sanitizeText(boundaryHeading.textContent);
      if (text) return text;
    }
  }

  return undefined;
}

function findHeadingInSiblings(element: HTMLElement): string | undefined {
  let sibling = element.previousElementSibling as HTMLElement | null;
  while (sibling) {
    if (sibling.matches?.(HEADING_SELECTOR)) {
      const text = sanitizeText(sibling.textContent);
      if (text) return text;
    }

    const nestedHeading = sibling.querySelector(HEADING_SELECTOR);
    if (nestedHeading) {
      const text = sanitizeText(nestedHeading.textContent);
      if (text) return text;
    }

    sibling = sibling.previousElementSibling as HTMLElement | null;
  }
  return undefined;
}

function buildSectionSummary(
  sectionRoot: HTMLElement | null,
  heading?: string,
): string | undefined {
  if (!sectionRoot) {
    return heading;
  }

  const text = sanitizeText(sectionRoot.textContent);
  if (!text) {
    return heading;
  }

  const truncated = truncate(text, MAX_SECTION_SUMMARY_LENGTH);
  if (heading && !truncated.startsWith(heading)) {
    return `${heading}: ${truncated}`;
  }
  return truncated;
}

function sanitizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}
