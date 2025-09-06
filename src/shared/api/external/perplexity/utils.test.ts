import { describe, it, expect } from "vitest";
import {
  TextUtils,
  RelevanceCalculator,
  ValidationUtils,
  IdGenerator,
} from "./utils";

describe("TextUtils", () => {
  describe("トークン化", () => {
    it("正しくトークン化される", () => {
      const text = "Hello, World! This is AI.";
      const tokens = TextUtils.tokenize(text);

      expect(tokens).toEqual(["hello", "world", "this"]);
    });

    it("空文字列は空配列を返す", () => {
      const tokens = TextUtils.tokenize("");
      expect(tokens).toEqual([]);
    });

    it("短い単語は除外される", () => {
      const text = "a to in the AI ML";
      const tokens = TextUtils.tokenize(text);

      expect(tokens).not.toContain("a");
      expect(tokens).not.toContain("to");
      expect(tokens).not.toContain("in");
    });
  });

  describe("類似度計算", () => {
    it("同一テキストは類似度1.0を返す", () => {
      const text = "artificial intelligence machine learning";
      const similarity = TextUtils.calculateSimilarity(text, text);

      expect(similarity).toBe(1.0);
    });

    it("異なるテキストは適切な類似度を返す", () => {
      const text1 = "artificial intelligence";
      const text2 = "machine learning";
      const similarity = TextUtils.calculateSimilarity(text1, text2);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });

    it("空文字列の場合の処理", () => {
      const similarity1 = TextUtils.calculateSimilarity("", "test");
      const similarity2 = TextUtils.calculateSimilarity("test", "");
      const similarity3 = TextUtils.calculateSimilarity("", "");

      expect(similarity1).toBe(0.0);
      expect(similarity2).toBe(0.0);
      expect(similarity3).toBe(1.0);
    });
  });
});

describe("RelevanceCalculator", () => {
  describe("関連度計算", () => {
    it("高関連コンテンツは高いスコアを返す", () => {
      const query = "artificial intelligence machine learning";
      const content =
        "Artificial intelligence and machine learning are important technologies.";

      const score = RelevanceCalculator.calculate(query, content);

      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("低関連コンテンツは低いスコアを返す", () => {
      const query = "artificial intelligence";
      const content =
        "Cooking recipes and traditional food preparation methods.";

      const score = RelevanceCalculator.calculate(query, content);

      expect(score).toBeLessThan(0.3);
    });

    it("空文字列は最小関連度を返す", () => {
      const score1 = RelevanceCalculator.calculate("", "some content");
      const score2 = RelevanceCalculator.calculate("query", "");

      expect(score1).toBe(0.1);
      expect(score2).toBe(0.1);
    });
  });
});

describe("ValidationUtils", () => {
  describe("バリデーション", () => {
    it("有効なAPIキーを正しく判定する", () => {
      expect(ValidationUtils.validateApiKey("valid-key")).toBe(true);
      expect(ValidationUtils.validateApiKey("")).toBe(false);
      expect(ValidationUtils.validateApiKey(undefined)).toBe(false);
    });

    it("有効なクエリを正しく判定する", () => {
      expect(ValidationUtils.validateQuery("test query")).toBe(true);
      expect(ValidationUtils.validateQuery("")).toBe(false);
      expect(ValidationUtils.validateQuery("   ")).toBe(false);
      expect(ValidationUtils.validateQuery(undefined)).toBe(false);
    });
  });
});

describe("IdGenerator", () => {
  describe("ID生成", () => {
    it("一意なリサーチIDを生成する", () => {
      const id1 = IdGenerator.generateResearchId();
      const id2 = IdGenerator.generateResearchId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^research-\d+-[a-z0-9]+$/);
    });

    it("結果IDを正しく生成する", () => {
      const baseId = "research-123-abc";
      const resultId = IdGenerator.generateResultId(baseId, 0);

      expect(resultId).toBe("research-123-abc-0");
    });
  });
});
