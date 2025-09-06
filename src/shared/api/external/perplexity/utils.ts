/**
 * Perplexity API ユーティリティ (POC用シンプル版)
 */

import { PerplexityConfig } from "./config";
import type { VoicePattern } from "../../generated/models/voicePattern";
/**
 * テキスト処理ユーティリティ（POC用シンプル版）
 */
export class TextUtils {
  /**
   * テキストを基本的なトークンに分割
   */
  static tokenize(text: string): string[] {
    if (!text?.trim()) return [];

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  /**
   * テキストの基本的な類似度を計算
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);

    if (words1.length === 0 && words2.length === 0) return 1.0;
    if (words1.length === 0 || words2.length === 0) return 0.0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}

/**
 * 関連度計算（POC用シンプル版）
 */
export class RelevanceCalculator {
  /**
   * シンプルな関連度計算
   */
  static calculate(query: string, content: string): number {
    if (!query?.trim() || !content?.trim()) {
      return 0.1; // 最小関連度
    }

    const queryWords = TextUtils.tokenize(query);
    const contentWords = TextUtils.tokenize(content);

    if (queryWords.length === 0) return 0.1;

    const contentSet = new Set(contentWords);
    const matches = queryWords.filter((word) => contentSet.has(word));

    return Math.min(matches.length / queryWords.length, 1.0);
  }
}

/**
 * バリデーションユーティリティ（POC用シンプル版）
 */
export class ValidationUtils {
  /**
   * 音声コマンドバリデーション
   */
  static validateVoiceCommand(voiceCommand?: string): VoicePattern | undefined {
    if (!voiceCommand) return undefined;

    return PerplexityConfig.isValidVoiceCommand(voiceCommand)
      ? (voiceCommand as VoicePattern)
      : undefined;
  }

  /**
   * クエリバリデーション
   */
  static validateQuery(query?: string): boolean {
    return Boolean(query?.trim());
  }

  /**
   * APIキーバリデーション
   */
  static validateApiKey(apiKey?: string): boolean {
    return Boolean(apiKey?.trim());
  }
}

/**
 * ID生成ユーティリティ（POC用シンプル版）
 */
export class IdGenerator {
  /**
   * リサーチID生成
   */
  static generateResearchId(): string {
    return `research-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * 結果ID生成
   */
  static generateResultId(baseId: string, index: number): string {
    return `${baseId}-${index}`;
  }
}
