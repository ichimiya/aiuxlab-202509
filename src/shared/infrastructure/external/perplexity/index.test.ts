import { describe, it, expect } from "vitest";
import {
  PerplexityClient,
  PerplexityAPIError,
  type ResearchContext,
} from "./index";

describe("PerplexityAPIError", () => {
  it("エラーメッセージを正しく設定", () => {
    const error = new PerplexityAPIError("Test error", "TEST_CODE", 400);

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.status).toBe(400);
    expect(error.name).toBe("PerplexityAPIError");
  });
});

describe("PerplexityClient (Infrastructure Layer)", () => {
  describe("constructor", () => {
    it("空のAPIキーでエラーを投げる", () => {
      expect(() => {
        new PerplexityClient({ apiKey: "" });
      }).toThrow("API key is required");
    });

    it("有効なAPIキーでインスタンスを作成", () => {
      expect(() => {
        new PerplexityClient({ apiKey: "valid-key" });
      }).not.toThrow();
    });
  });

  describe("search", () => {
    it("空のクエリでエラーを投げる", async () => {
      const client = new PerplexityClient({ apiKey: "test-key" });

      await expect(client.search({ query: "" })).rejects.toThrow(
        "Query is required",
      );
    });

    it("有効なクエリのプロンプト構築", () => {
      const client = new PerplexityClient({ apiKey: "test-key" });

      // プライベートメソッドbuildPromptをテストするために型アサーション
      const buildPrompt = (
        client as unknown as {
          buildPrompt: (
            context: ResearchContext,
          ) => Array<{ role: string; content: string }>;
        }
      ).buildPrompt.bind(client);

      const context: ResearchContext = {
        query: "テストクエリ",
      };

      const messages = buildPrompt(context);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toContain("リサーチ専門家");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toBe("テストクエリ");
    });

    it("選択テキスト付きクエリのプロンプト構築", () => {
      const client = new PerplexityClient({ apiKey: "test-key" });

      const buildPrompt = (
        client as unknown as {
          buildPrompt: (
            context: ResearchContext,
          ) => Array<{ role: string; content: string }>;
        }
      ).buildPrompt.bind(client);

      const context: ResearchContext = {
        query: "テストクエリ",
        selectedText: "選択されたテキスト",
      };

      const messages = buildPrompt(context);

      expect(messages).toHaveLength(2);
      expect(messages[1].content).toContain(
        "【選択されたテキスト】\n選択されたテキスト",
      );
      expect(messages[1].content).toContain("【リサーチクエリ】\nテストクエリ");
    });
  });
});
