/**
 * パフォーマンス最適化ユーティリティ
 *
 * テキスト処理、関連度計算、バリデーション処理の高速化を実現
 * メモ化とキャッシュ機能により重複処理を削減
 */

import { PerplexityConfig } from "./config";
import type { VoicePattern } from "../../generated/models/voicePattern";

/**
 * LRUキャッシュの実装
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 最近使用したものを最後に移動
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 最も古いものを削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * テキスト処理最適化ユーティリティ
 */
export class TextUtils {
  private static tokenizeCache = new LRUCache<string, string[]>(
    PerplexityConfig.PERFORMANCE_CONFIG.CACHING.PROMPT_TEMPLATE_CACHE_SIZE,
  );

  /**
   * テキストを高速トークン化（メモ化付き）
   */
  static tokenize(text: string): string[] {
    if (!text?.trim()) return [];

    // キャッシュチェック
    const cached = this.tokenizeCache.get(text);
    if (cached) return cached;

    // トークン化実行
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // 記号を空白に置換
      .split(/\s+/)
      .filter(
        (word) =>
          word.length >
          PerplexityConfig.PERFORMANCE_CONFIG.RELEVANCE_CALCULATION
            .MIN_WORD_LENGTH,
      );

    // キャッシュに保存
    this.tokenizeCache.set(text, tokens);
    return tokens;
  }

  /**
   * 完全一致カウント（Set使用で高速化）
   */
  static countExactMatches(
    queryWords: string[],
    contentWords: string[],
  ): number {
    const contentSet = new Set(contentWords);
    return queryWords.filter((word) => contentSet.has(word)).length;
  }

  /**
   * 部分一致カウント（最適化版）
   */
  static countPartialMatches(
    queryWords: string[],
    contentWords: string[],
  ): number {
    const contentSet = new Set(contentWords);

    return queryWords.filter((queryWord) => {
      // 完全一致は除外
      if (contentSet.has(queryWord)) return false;

      // 部分一致チェック（短絡評価で高速化）
      return contentWords.some(
        (contentWord) =>
          contentWord.includes(queryWord) || queryWord.includes(contentWord),
      );
    }).length;
  }

  /**
   * テキストの類似度を高速計算
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

    return intersection.size / union.size; // Jaccard係数
  }

  /**
   * キャッシュクリア
   */
  static clearCache(): void {
    this.tokenizeCache.clear();
  }
}

/**
 * 関連度計算の最適化
 */
export class RelevanceCalculator {
  private static calculationCache = new LRUCache<string, number>(
    PerplexityConfig.PERFORMANCE_CONFIG.CACHING.CONFIG_MERGE_CACHE_SIZE,
  );

  /**
   * 高速関連度計算（キャッシュ付き）
   */
  static calculate(query: string, content: string): number {
    if (!query?.trim() || !content?.trim()) {
      return PerplexityConfig.RESEARCH_CONSTANTS.MIN_RELEVANCE_SCORE;
    }

    // キャッシュキー生成（ハッシュ化で高速化）
    const cacheKey = this.generateCacheKey(query, content);
    const cached = this.calculationCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // 関連度計算実行
    const score = this.performCalculation(query, content);

    // キャッシュに保存
    this.calculationCache.set(cacheKey, score);
    return score;
  }

  /**
   * 実際の関連度計算処理
   */
  private static performCalculation(query: string, content: string): number {
    const queryWords = TextUtils.tokenize(query);
    const contentWords = TextUtils.tokenize(content);

    if (queryWords.length === 0) {
      return PerplexityConfig.RESEARCH_CONSTANTS.MIN_RELEVANCE_SCORE;
    }

    // 完全一致と部分一致を並列計算
    const exactMatches = TextUtils.countExactMatches(queryWords, contentWords);
    const partialMatches = TextUtils.countPartialMatches(
      queryWords,
      contentWords,
    );

    // 重み付きスコア計算
    const { EXACT_MATCH_WEIGHT, PARTIAL_MATCH_WEIGHT } =
      PerplexityConfig.PERFORMANCE_CONFIG.RELEVANCE_CALCULATION;

    const totalWeight = EXACT_MATCH_WEIGHT + PARTIAL_MATCH_WEIGHT;

    const score =
      (exactMatches * EXACT_MATCH_WEIGHT +
        partialMatches * PARTIAL_MATCH_WEIGHT) /
      (queryWords.length * totalWeight);

    return PerplexityConfig.clampRelevanceScore(score);
  }

  /**
   * キャッシュキー生成（ハッシュ化で高速化）
   */
  private static generateCacheKey(query: string, content: string): string {
    // 簡易ハッシュ関数（衝突確率は低い）
    const hash = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 32bit integerに変換
      }
      return hash;
    };

    return `${hash(query)}-${hash(content)}`;
  }

  /**
   * キャッシュクリア
   */
  static clearCache(): void {
    this.calculationCache.clear();
  }
}

/**
 * バリデーション最適化
 */
export class ValidationUtils {
  /**
   * 音声コマンドバリデーション（型安全）
   */
  static validateVoiceCommand(voiceCommand?: string): VoicePattern | undefined {
    if (!voiceCommand) return undefined;

    return PerplexityConfig.isValidVoiceCommand(voiceCommand)
      ? (voiceCommand as VoicePattern)
      : undefined;
  }

  /**
   * リサーチコンテキストバリデーション
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

  /**
   * レスポンス構造バリデーション（型ガード）
   */
  static isValidResponse(response: unknown): response is {
    id: string;
    choices: Array<{ message: { content: string } }>;
  } {
    return (
      typeof response === "object" &&
      response !== null &&
      "id" in response &&
      "choices" in response &&
      typeof (response as { id?: unknown }).id === "string" &&
      Array.isArray((response as { choices?: unknown }).choices) &&
      (response as { choices: unknown[] }).choices.length > 0
    );
  }
}

/**
 * ID生成最適化
 */
export class IdGenerator {
  private static counter = 0;
  private static readonly TIMESTAMP_BASE = Date.now();

  /**
   * 高速一意ID生成
   */
  static generateResearchId(): string {
    const timestamp = Date.now() - this.TIMESTAMP_BASE; // オフセット削減
    const counter = ++this.counter;
    const random = Math.floor(Math.random() * 0x10000).toString(16); // 16進数で短縮

    return `${PerplexityConfig.RESEARCH_CONSTANTS.ID_PREFIX}-${timestamp}-${counter}-${random}`;
  }

  /**
   * 結果ID生成（より短縮）
   */
  static generateResultId(baseId: string, index: number): string {
    return `${baseId}-${index}`;
  }
}

/**
 * パフォーマンス監視
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();

  /**
   * 処理時間測定開始
   */
  static startMeasurement(key: string): () => number {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.measurements.has(key)) {
        this.measurements.set(key, []);
      }
      this.measurements.get(key)!.push(duration);

      return duration;
    };
  }

  /**
   * 平均実行時間取得
   */
  static getAverageTime(key: string): number {
    const times = this.measurements.get(key) || [];
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  /**
   * 統計クリア
   */
  static clearMeasurements(): void {
    this.measurements.clear();
  }
}
