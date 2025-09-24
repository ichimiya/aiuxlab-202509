import type { ResearchResultSnapshot } from "@/shared/useCases/ports/research";

export interface MindMapNode {
  id: string;
  label: string;
  tagName: string;
  depth: number;
  children: MindMapNode[];
  domPath: number[];
  metadata?: {
    source?: string;
    relevanceScore?: number;
    resultId?: string;
    elementId?: string;
  };
}

interface BuildContext {
  prefix: string;
  depth: number;
  counter: () => number;
  maxDepth: number;
  domPath: number[];
  resultId: string;
  headingUsedAsLabel?: Element | null;
}

const IGNORED_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "svg",
]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const TEXT_LIKE_TAGS = new Set([
  "p",
  "li",
  "span",
  "strong",
  "em",
  "code",
  "blockquote",
]);
const LIST_CONTAINER_TAGS = new Set(["ul", "ol"]);
const MAX_LABEL_LENGTH = 120;
const MAX_TREE_DEPTH = 6;

export interface BuildMindMapOptions {
  /** 任意: 深さの上限を調整したい場合に使用 */
  maxDepth?: number;
}

export function buildMindMapFromResults(
  results: ResearchResultSnapshot[],
  options: BuildMindMapOptions = {},
): MindMapNode[] {
  const nodes: MindMapNode[] = [];
  const maxDepth = Math.max(1, options.maxDepth ?? MAX_TREE_DEPTH);

  for (const result of results) {
    const html = result.htmlContent?.trim();
    if (!html) {
      continue;
    }

    const document = createDocument(html);
    if (!document) {
      continue;
    }

    const counter = createCounter();
    const rootLabel = deriveRootLabel(document, result);

    const rootChildren: MindMapNode[] = [];
    const bodyChildren = Array.from(document.body?.children ?? []);

    bodyChildren.forEach((element, index) => {
      const childNode = elementToNode(element, {
        prefix: result.id,
        depth: 1,
        counter,
        maxDepth,
        domPath: [index],
        resultId: result.id,
      });
      if (childNode) {
        rootChildren.push(childNode);
      }
    });

    if (!rootLabel && rootChildren.length === 0) {
      continue;
    }

    let effectiveChildren = rootChildren;
    if (
      rootLabel &&
      rootChildren.length === 1 &&
      rootChildren[0].label.toLowerCase() === rootLabel.toLowerCase()
    ) {
      effectiveChildren = rootChildren[0].children;
    }

    nodes.push({
      id: result.id,
      label: rootLabel || result.source || result.id,
      tagName: "result",
      depth: 0,
      domPath: [],
      children: effectiveChildren,
      metadata: {
        source: result.source,
        relevanceScore: result.relevanceScore,
        resultId: result.id,
        elementId: undefined,
      },
    });
  }

  return nodes;
}

function elementToNode(
  element: Element,
  context: BuildContext,
): MindMapNode | null {
  if (context.depth > context.maxDepth) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();
  if (IGNORED_TAGS.has(tagName)) {
    return null;
  }

  const labelInfo = deriveElementLabel(element);
  const isTextualLabel = Boolean(labelInfo?.usesSelfText);
  const label =
    labelInfo?.label ??
    (TEXT_LIKE_TAGS.has(tagName) ? sanitizeText(element.textContent) : null);
  const headingUsedAsLabel = labelInfo?.headingUsedAsLabel ?? null;

  const children: MindMapNode[] = [];
  const nextDepth = context.depth + 1;
  let elementChildIndex = 0;

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === child.ELEMENT_NODE) {
      const childElement = child as Element;
      const childTag = childElement.tagName.toLowerCase();

      if (headingUsedAsLabel && child === headingUsedAsLabel) {
        elementChildIndex += 1;
        continue;
      }

      const childNode = elementToNode(childElement, {
        prefix: context.prefix,
        depth: nextDepth,
        counter: context.counter,
        maxDepth: context.maxDepth,
        domPath: [...context.domPath, elementChildIndex],
        resultId: context.resultId,
      });

      if (childNode) {
        if (LIST_CONTAINER_TAGS.has(childTag)) {
          for (const listChild of childNode.children) {
            children.push({
              ...listChild,
              depth: nextDepth,
            });
          }
        } else {
          children.push(childNode);
        }
      }

      elementChildIndex += 1;
      continue;
    } else if (child.nodeType === child.TEXT_NODE && !isTextualLabel) {
      const textContent = sanitizeText(child.textContent);
      if (textContent) {
        children.push({
          id: `${context.prefix}-${context.counter()}`,
          label: textContent,
          tagName: "#text",
          depth: nextDepth,
          domPath: context.domPath,
          children: [],
          metadata: {
            resultId: context.resultId,
            elementId: undefined,
          },
        });
      }
    }
  }

  const trimmedLabel = sanitizeText(label ?? "");

  if (!trimmedLabel && children.length === 0) {
    return null;
  }

  if (!trimmedLabel && children.length === 1) {
    // ラベルが無いラッパー要素は子ノードを昇格
    return {
      ...children[0],
      depth: context.depth,
    };
  }

  return {
    id: `${context.prefix}-${context.counter()}`,
    label: trimmedLabel || tagName,
    tagName,
    depth: context.depth,
    children,
    domPath: context.domPath,
    metadata: {
      resultId: context.resultId,
      elementId: element.getAttribute("id") ?? undefined,
    },
  };
}

function deriveRootLabel(
  document: Document,
  result: ResearchResultSnapshot,
): string | null {
  const heading = document.querySelector("h1, h2, h3");
  if (heading) {
    return sanitizeText(heading.textContent);
  }

  const title = document.title;
  if (title) {
    return sanitizeText(title);
  }

  const firstParagraph = document.querySelector("p");
  if (firstParagraph) {
    const text = sanitizeText(firstParagraph.textContent);
    if (text) {
      return text;
    }
  }

  const fallback = sanitizeText(result.content) || sanitizeText(result.source);
  return fallback || null;
}

function deriveElementLabel(element: Element): {
  label: string | null;
  usesSelfText?: boolean;
  headingUsedAsLabel?: Element | null;
} | null {
  const tagName = element.tagName.toLowerCase();

  if (HEADING_TAGS.has(tagName) || TEXT_LIKE_TAGS.has(tagName)) {
    const text = sanitizeText(element.textContent);
    return {
      label: text,
      usesSelfText: true,
    };
  }

  const labelledByAttr =
    element.getAttribute("aria-label") ||
    element.getAttribute("data-title") ||
    element.getAttribute("title");
  if (labelledByAttr) {
    return { label: sanitizeText(labelledByAttr) };
  }

  const heading = element.querySelector(
    ":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6",
  );
  if (heading) {
    const text = sanitizeText(heading.textContent);
    if (text) {
      return {
        label: text,
        headingUsedAsLabel: heading,
      };
    }
  }

  return null;
}

function sanitizeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_LABEL_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_LABEL_LENGTH - 1)}…`;
}

function createDocument(html: string): Document | null {
  let parser: DOMParser | null = null;

  if (
    typeof window !== "undefined" &&
    typeof window.DOMParser !== "undefined"
  ) {
    parser = new window.DOMParser();
  } else if (typeof DOMParser !== "undefined") {
    parser = new DOMParser();
  }

  if (!parser) {
    console.warn(
      "MindMap: DOMParser is not available in the current environment",
    );
    return null;
  }

  return parser.parseFromString(html, "text/html");
}

function createCounter() {
  let index = 0;
  return () => {
    index += 1;
    return index;
  };
}
