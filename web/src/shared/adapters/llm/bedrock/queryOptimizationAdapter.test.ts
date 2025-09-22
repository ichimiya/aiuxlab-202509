import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueryOptimizationRequest } from "@/shared/domain/queryOptimization/services";

// Mock AWS Bedrock client
const invokedInputs: any[] = [];
const sendMock = vi.fn();
vi.mock("@aws-sdk/client-bedrock-runtime", () => {
  class BedrockRuntimeClient {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts?: any) {}
    send = sendMock;
  }
  class InvokeModelCommand {
    constructor(input: any) {
      invokedInputs.push(input);
    }
  }
  return { BedrockRuntimeClient, InvokeModelCommand };
});

import { BedrockQueryOptimizationAdapter } from "./queryOptimizationAdapter";

describe("BedrockQueryOptimizationAdapter", () => {
  beforeEach(() => {
    invokedInputs.length = 0;
    sendMock.mockReset();
  });

  it("最適化結果を返す（プロンプトに文脈要約を含む）", async () => {
    const client = new BedrockQueryOptimizationAdapter({
      region: "us-east-1",
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    });

    const payload = {
      candidates: [
        {
          id: "candidate-1",
          query: "AIの潜在的リスクと安全対策の包括的評価",
          coverageScore: 0.86,
          coverageExplanation: "安全対策と事故事例を追加",
          addedAspects: ["規制動向", "事故事例"],
          improvementReason: "曖昧さの解消と具体性の付与",
          suggestedFollowups: ["国際比較", "実装上の安全基準"],
        },
      ],
      evaluationSummary: "安全・事故観点で強化",
      recommendedCandidateId: "candidate-1",
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    const req: QueryOptimizationRequest = {
      originalQuery: "AIって危険？",
      selectedText: "[自動運転事故のニュース記事の抜粋]",
      voiceCommand: "deepdive",
    };

    const result = await client.optimizeQuery(req);
    expect(result.candidates[0].query).toMatch(/リスク|安全/);
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    expect(typeof sent.system).toBe("string");
    const userPayload = JSON.parse(sent.messages?.[0]?.content as string);
    expect(userPayload.contextSummary).toContain("選択テキスト");
    expect(userPayload.contextSummary).toContain("音声コマンド");
  });

  it("Bedrock応答が不正JSONならエラーを投げる", async () => {
    const client = new BedrockQueryOptimizationAdapter();
    const bad = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: "{not-json" }] }),
    );
    sendMock.mockResolvedValueOnce({ body: bad });

    await expect(
      client.optimizeQuery({ originalQuery: "AIの倫理" }),
    ).rejects.toThrow(/Invalid optimization response/i);
  });

  it("プロンプトに厳密JSON出力指示とセクションが含まれる", async () => {
    const client = new BedrockQueryOptimizationAdapter();
    const payload = {
      candidates: [
        {
          id: "candidate-1",
          query: "test",
          coverageScore: 0.5,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    await client.optimizeQuery({ originalQuery: "AIって危険？" });
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const system: string = sent.system as string;
    expect(system).toContain("### OUTPUT_JSON_ONLY");
    expect(system).toContain("candidates");
    expect(system).toContain("coverageScore");
    expect(system).toContain("coverageExplanation");
    expect(system).toContain("### PRINCIPLES");
  });

  it("プロンプトに現在年と最近の年範囲が含まれる(2025固定)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-06T00:00:00Z"));
    const client = new BedrockQueryOptimizationAdapter();
    const payload = {
      candidates: [
        {
          id: "candidate-1",
          query: "test",
          coverageScore: 0.5,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    await client.optimizeQuery({ originalQuery: "Jリーグのチームを調べたい" });
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const system: string = sent.system as string;
    expect(system).toContain("### TEMPORAL_CONTEXT");
    expect(system).toContain("CURRENT_YEAR: 2025");
    expect(system).toContain("RECENT_RANGE: 2023–2025");
    vi.useRealTimers();
  });

  it("プロンプトに最小拡張ポリシーが含まれ、過剰な拡張を抑制する指示がある", async () => {
    const client = new BedrockQueryOptimizationAdapter();
    const payload = {
      candidates: [
        {
          id: "candidate-1",
          query: "test",
          coverageScore: 0.5,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    await client.optimizeQuery({ originalQuery: "Jリーグのチームを調べたい" });
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const system: string = sent.system as string;
    expect(system).toContain("### EXPANSION_POLICY");
    expect(system).toContain("MODE: minimal");
    expect(system).toContain("過剰な拡張を禁止");
    expect(system).toContain("追加観点は最大1件");
  });

  it("プロンプトがクエリを自然文として生成するよう要求する", async () => {
    const client = new BedrockQueryOptimizationAdapter();
    const payload = {
      candidates: [
        {
          id: "candidate-1",
          query: "test",
          coverageScore: 0.5,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    await client.optimizeQuery({ originalQuery: "Jリーグのチームを調べたい" });
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const system: string = sent.system as string;
    const userPayload = JSON.parse(sent.messages?.[0]?.content as string);
    expect(system).toContain("クエリは自然な文章として記述");
    expect(system).toContain("文脈に沿った完結した文");
    expect(system).toContain("### OUTPUT_STYLE");
    expect(system).toContain(
      "すべてのcandidate.queryは論文タイトルのような自然な名詞句で表現する",
    );
    expect(system).toContain(
      "文頭で対象を明示し、文末は『〜の調査』『〜の比較』『〜の分析』などの体言止めで締める",
    );
    expect(system).toContain("断片的な語句（例: 'AI 安全性 動向 2025'）は禁止");
    expect(system).toContain("### OUTPUT_EXAMPLES");
    expect(system).toContain("入力例: Jリーグ 2025年 チーム一覧");
    expect(system).toContain("適合例: 2025年のJリーグ所属チーム一覧の調査");
    expect(system).toContain("不適合例: Jリーグ 2025 チーム一覧");
    expect(userPayload.inputQuery).toBe("Jリーグのチームを調べたい");
  });

  it("DEBUG_QUERY_OPTIMIZATION_PROMPT環境変数が有効な場合、プロンプトをログ出力する", async () => {
    const client = new BedrockQueryOptimizationAdapter();
    const payload = {
      candidates: [
        {
          id: "candidate-1",
          query: "test",
          coverageScore: 0.5,
          coverageExplanation: "",
          addedAspects: [],
          improvementReason: "",
          suggestedFollowups: [],
        },
      ],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    const original = process.env.DEBUG_QUERY_OPTIMIZATION_PROMPT;
    process.env.DEBUG_QUERY_OPTIMIZATION_PROMPT = "1";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await client.optimizeQuery({
        originalQuery: "Jリーグのチームを調べたい",
      });
      expect(logSpy).toHaveBeenCalled();
      const logged = logSpy.mock.calls
        .map((args) => args[0])
        .find(
          (entry) =>
            typeof entry === "string" &&
            entry.includes("[QueryOptimizationPrompt]"),
        );
      expect(logged).toContain("SYSTEM:");
      expect(logged).toContain("USER:");
      expect(logged).toContain("Jリーグのチームを調べたい");
    } finally {
      logSpy.mockRestore();
      if (original === undefined) {
        delete process.env.DEBUG_QUERY_OPTIMIZATION_PROMPT;
      } else {
        process.env.DEBUG_QUERY_OPTIMIZATION_PROMPT = original;
      }
    }
  });
});
