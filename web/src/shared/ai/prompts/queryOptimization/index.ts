import requestSchema from "./request.json";
import responseSchema from "./response.json";
import {
  expansionPolicy,
  jsonSchema,
  temporalContext,
} from "@/shared/ai/prompts/utils";
import type { QueryOptimizationRequest } from "@/shared/domain/queryOptimization/services";

export interface QueryOptimizationPrompt {
  system: string;
  user: string;
}

export interface QueryOptimizationPromptInput {
  request: QueryOptimizationRequest;
  contextSummary: string;
}

function schemaLines(schema: unknown): string[] {
  return JSON.stringify(schema, null, 2).split("\n").slice(1, -1);
}

function buildMetadata(req: QueryOptimizationRequest) {
  const researchHistory = Array.isArray(req.researchHistory)
    ? req.researchHistory
    : [];
  return {
    voiceCommand: req.voiceCommand ?? null,
    voiceTranscript: req.voiceTranscript ?? null,
    selectedText: req.selectedText ?? null,
    userContext: req.userContext ?? null,
    researchHistoryCount: researchHistory.length,
    sessionId: req.sessionId ?? null,
  };
}

export function buildQueryOptimizationPrompt(
  input: QueryOptimizationPromptInput,
): QueryOptimizationPrompt {
  const { request, contextSummary } = input;
  const responseLines = schemaLines(responseSchema);
  const requestLines = schemaLines(requestSchema);

  const systemSections = [
    "### ROLE",
    "あなたは世界最高レベルのリサーチクエリ最適化専門家です。ユーザーの曖昧・不完全な質問を、効果的で検索効率の高いクエリへ変換します。",
    temporalContext(),
    "",
    "### INPUT_SCHEMA",
    "{",
    ...requestLines,
    "}",
    "",
    "### PRINCIPLES",
    "1. 具体性と明確性を高める",
    "2. 多角的な調査観点（Who/What/When/Where/Why/How、比較・トレンド・データ・実務観点）を適切に追加",
    "3. 検索効率（固有名詞・時制・条件・評価指標）を最適化",
    "4. ユーザーの潜在的な意図を先取りしつつ過剰拡張は避ける",
    "5. 候補は必ず3件生成し、互いに観点が異なるよう調整する",
    "6. 各候補にcoverageScore(0〜1)、coverageExplanationを必須で付与する",
    "7. 出力言語は入力と同じ言語に合わせる",
    "8. 不確実・曖昧表現は具体語に置換（例: ‘最近’→時制コンテキストの範囲など）",
    "9. クエリは自然な文章として記述し、文脈に沿った完結した文で返す",
    "",
    "### OUTPUT_STYLE",
    "- すべてのcandidate.queryは論文タイトルのような自然な名詞句で表現する",
    "- 文頭で対象を明示し、文末は『〜の調査』『〜の比較』『〜の分析』などの体言止めで締める",
    "- 断片的な語句（例: 'AI 安全性 動向 2025'）は禁止、助詞や句読点を用いて自然な文にする",
    "",
    expansionPolicy("minimal"),
    "",
    jsonSchema(responseLines),
    "",
    "### OUTPUT_EXAMPLES",
    "入力例: Jリーグ 2025年 チーム一覧",
    "適合例: 2025年のJリーグ所属チーム一覧の調査",
    "不適合例: Jリーグ 2025 チーム一覧",
  ];

  const system = systemSections.join("\n");

  const userPayload = {
    inputQuery: request.originalQuery,
    contextSummary: contextSummary || null,
    metadata: buildMetadata(request),
  };

  return {
    system,
    user: JSON.stringify(userPayload, null, 2),
  };
}

export type { QueryOptimizationRequest };
