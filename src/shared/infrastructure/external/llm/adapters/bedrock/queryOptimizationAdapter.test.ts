import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueryOptimizationRequest } from "@/shared/domain/queryOptimization/services";

// Mock AWS Bedrock client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invokedInputs: any[] = [];
const sendMock = vi.fn();
vi.mock("@aws-sdk/client-bedrock-runtime", () => {
  class BedrockRuntimeClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    constructor(_opts?: any) {}
    send = sendMock;
  }
  class InvokeModelCommand {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      optimizedQuery: "AIの潜在的リスクと安全対策の包括的評価",
      addedAspects: ["規制動向", "事故事例"],
      improvementReason: "曖昧さの解消と具体性の付与",
      confidence: 0.86,
      suggestedFollowups: ["国際比較", "実装上の安全基準"],
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
    expect(result.optimizedQuery).toMatch(/リスク|安全/);
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const content: string = sent.messages?.[0]?.content as string;
    expect(content).toContain("選択テキスト");
    expect(content).toContain("音声コマンド");
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
      optimizedQuery: "test",
      addedAspects: [],
      improvementReason: "",
      confidence: 0.5,
      suggestedFollowups: [],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    await client.optimizeQuery({ originalQuery: "AIって危険？" });
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const content: string = sent.messages?.[0]?.content as string;
    expect(content).toContain("### OUTPUT_JSON_ONLY");
    expect(content).toContain("optimizedQuery");
    expect(content).toContain("addedAspects");
    expect(content).toContain("suggestedFollowups");
    expect(content).toContain("### CONTEXT");
    expect(content).toContain("### PRINCIPLES");
  });

  it("プロンプトに現在年と最近の年範囲が含まれる(2025固定)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-09-06T00:00:00Z"));
    const client = new BedrockQueryOptimizationAdapter();
    const payload = {
      optimizedQuery: "test",
      addedAspects: [],
      improvementReason: "",
      confidence: 0.5,
      suggestedFollowups: [],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    await client.optimizeQuery({ originalQuery: "Jリーグのチームを調べたい" });
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const content: string = sent.messages?.[0]?.content as string;
    expect(content).toContain("### TEMPORAL_CONTEXT");
    expect(content).toContain("CURRENT_YEAR: 2025");
    expect(content).toContain("RECENT_RANGE: 2023–2025");
    vi.useRealTimers();
  });

  it("プロンプトに最小拡張ポリシーが含まれ、過剰な拡張を抑制する指示がある", async () => {
    const client = new BedrockQueryOptimizationAdapter();
    const payload = {
      optimizedQuery: "test",
      addedAspects: [],
      improvementReason: "",
      confidence: 0.5,
      suggestedFollowups: [],
    };
    const body = new TextEncoder().encode(
      JSON.stringify({ content: [{ text: JSON.stringify(payload) }] }),
    );
    sendMock.mockResolvedValueOnce({ body });

    await client.optimizeQuery({ originalQuery: "Jリーグのチームを調べたい" });
    const last = invokedInputs.at(-1);
    const sent = JSON.parse(last.body);
    const content: string = sent.messages?.[0]?.content as string;
    expect(content).toContain("### EXPANSION_POLICY");
    expect(content).toContain("MODE: minimal");
    expect(content).toContain("過剰な拡張を禁止");
    expect(content).toContain("追加観点は最大1件");
  });
});
