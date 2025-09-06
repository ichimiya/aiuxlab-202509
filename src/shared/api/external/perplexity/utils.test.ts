import { describe, it, expect } from "vitest";
import { TextUtils, RelevanceCalculator } from "./utils";

describe("TextUtils", () => {
  describe("トークン化パフォーマンス", () => {
    it("大量のテキストを効率的にトークン化する", () => {
      const largeText = Array.from(
        { length: 1000 },
        (_, i) => `word${i} artificial intelligence machine learning`,
      ).join(" ");

      const startTime = performance.now();
      const tokens = TextUtils.tokenize(largeText);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
      expect(tokens.length).toBeGreaterThan(1000); // 大量のトークン
      expect(tokens).toContain("artificial");
    });

    it("メモ化により同じテキストは高速処理される", () => {
      const text = "artificial intelligence machine learning";

      // 1回目
      const startTime1 = performance.now();
      const tokens1 = TextUtils.tokenize(text);
      const endTime1 = performance.now();

      // 2回目（キャッシュされている）
      const startTime2 = performance.now();
      const tokens2 = TextUtils.tokenize(text);
      const endTime2 = performance.now();

      expect(tokens1).toEqual(tokens2);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });

    it("正しくトークン化される", () => {
      const text = "Hello, World! This is AI.";
      const tokens = TextUtils.tokenize(text);

      expect(tokens).toEqual(["hello", "world", "this"]);
    });
  });

  describe("部分一致検出の最適化", () => {
    it("効率的に部分一致をカウントする", () => {
      const queryWords = ["tech", "learn", "artif"];
      const contentWords = [
        "technology",
        "machine",
        "learning",
        "algorithms",
        "artificial",
        "intelligence",
      ];

      const startTime = performance.now();
      const partialMatches = TextUtils.countPartialMatches(
        queryWords,
        contentWords,
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5); // 5ms以内
      expect(partialMatches).toBeGreaterThan(0);
    });
  });
});

describe("RelevanceCalculator", () => {
  describe("スコア計算の最適化", () => {
    it("高速にスコアを計算する", () => {
      const query =
        "artificial intelligence machine learning deep neural networks";
      const content =
        "Artificial intelligence and machine learning are revolutionizing technology. Deep neural networks enable sophisticated AI systems to process complex data patterns.";

      const startTime = performance.now();
      const score = RelevanceCalculator.calculate(query, content);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5); // 5ms以内
      expect(score).toBeGreaterThan(0.5); // 高い関連性
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("空文字列を効率的に処理する", () => {
      const score1 = RelevanceCalculator.calculate("", "some content");
      const score2 = RelevanceCalculator.calculate("query", "");
      const score3 = RelevanceCalculator.calculate("", "");

      expect(score1).toBe(0.1); // MIN_RELEVANCE_SCORE
      expect(score2).toBe(0.1);
      expect(score3).toBe(0.1);
    });

    it("複雑なテキストで正確なスコアを計算する", () => {
      const query = "quantum computing algorithms";
      const highRelevanceContent =
        "Quantum computing algorithms utilize quantum mechanical phenomena to perform calculations faster than classical computers.";
      const lowRelevanceContent =
        "Traditional cooking recipes have been passed down through generations in various cultures.";

      const highScore = RelevanceCalculator.calculate(
        query,
        highRelevanceContent,
      );
      const lowScore = RelevanceCalculator.calculate(
        query,
        lowRelevanceContent,
      );

      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(0.3);
      expect(lowScore).toBeLessThan(0.2);
    });
  });
});

describe("統合パフォーマンス", () => {
  it("大量データ処理でもパフォーマンスが保たれる", () => {
    const queries = Array.from(
      { length: 100 },
      (_, i) =>
        `test query ${i} with various keywords artificial intelligence machine learning`,
    );
    const content =
      "This is a test content about artificial intelligence, machine learning, deep learning, neural networks, and various AI technologies.".repeat(
        10,
      );

    const startTime = performance.now();

    const scores = queries.map((query) =>
      RelevanceCalculator.calculate(query, content),
    );

    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    expect(scores).toHaveLength(100);
    expect(scores.every((score) => score > 0 && score <= 1)).toBe(true);
  });
});
