/**
 * Text Selection Model (Domain/Business logic)
 * インフラ非依存の純粋ロジック
 */

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export type Language = "ja" | "en" | "unknown";
export type SelectionType = "paragraph" | "sentence" | "phrase" | "word";

export interface SelectionMetadata {
  wordCount: number;
  language: Language;
  selectionType: SelectionType;
}

export interface TextSelectionModel {
  validateSelection: (text: string) => ValidationResult;
  normalizeSelectionBoundary: (range: Range) => Range;
  extractContext: (range: Range, contextLength?: number) => string;
  calculateSelectionMetadata: (selection: Selection) => SelectionMetadata;
}

export const textSelectionModel: TextSelectionModel = {
  validateSelection(text: string): ValidationResult {
    const trimmed = (text ?? "").trim();
    // 空白・改行を除いた実質文字長で判定（1文字以上でOK）
    const effective = trimmed.replace(/\s+/g, "");
    if (effective.length === 0)
      return { isValid: false, reason: "空白のみの選択です" };
    // 上限: トリム後の文字数が3000文字を超える場合は無効
    if (trimmed.length > 3000)
      return { isValid: false, reason: "長すぎます(3000文字以下)" };
    return { isValid: true };
  },

  // 初期実装: 文境界調整は将来対応。現状はそのまま返す。
  normalizeSelectionBoundary(range: Range): Range {
    return range;
  },

  extractContext(range: Range, contextLength = 200): string {
    try {
      const selected = range.toString();
      const container = range.commonAncestorContainer as Node;
      const baseText =
        (container.nodeType === Node.ELEMENT_NODE
          ? (container as Element).textContent
          : container.textContent) || "";

      const idx = baseText.indexOf(selected);
      if (idx === -1) {
        // フォールバック: 選択文字列のみ返す
        return selected;
      }
      const start = Math.max(0, idx - contextLength);
      const end = Math.min(
        baseText.length,
        idx + selected.length + contextLength,
      );
      return baseText.slice(start, end);
    } catch {
      return range.toString();
    }
  },

  calculateSelectionMetadata(selection: Selection): SelectionMetadata {
    const text = (selection?.toString() ?? "").trim();
    const language: Language = detectLanguage(text);
    const wordCount = countWords(text, language);
    const selectionType: SelectionType = classifySelectionType(text);
    return { wordCount, language, selectionType };
  },
};

// ============ helpers ============

function detectLanguage(text: string): Language {
  if (!text) return "unknown";
  const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text); // かな/カナ/漢字
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasJapanese) return "ja";
  if (hasLatin) return "en";
  return "unknown";
}

function countWords(text: string, lang: Language): number {
  if (!text) return 0;
  if (lang === "en") {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
  // 日本語など空白を挟まない言語は概算: 記号・空白除外の文字数
  const cleaned = text.replace(/[\s\p{P}\p{S}]+/gu, "");
  return cleaned.length;
}

function classifySelectionType(text: string): SelectionType {
  if (!text) return "word";
  const trimmed = text.trim();
  if (/\n/.test(trimmed) || trimmed.length > 300) return "paragraph";
  if (/[。．.!?！？]$/.test(trimmed)) return "sentence";
  if (trimmed.length > 20) return "phrase";
  return "word";
}

export default textSelectionModel;
