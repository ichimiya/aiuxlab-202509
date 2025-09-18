import { jsonSchema, temporalContext } from "@/shared/ai/prompts/utils";
import { VOICE_INTENT_IDS } from "@/shared/domain/voice/intents";
import type {
  VoiceIntentInput,
  VoiceSessionState,
} from "@/shared/useCases/ports/voice";

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type VoiceSessionSummary = {
  status?: VoiceSessionState["status"];
  selectedCandidateId?: VoiceSessionState["selectedCandidateId"];
  candidates?: Array<{
    id?: unknown;
    rank?: unknown;
    query?: unknown;
  }>;
};

function buildSessionSummary(session: unknown): VoiceSessionSummary | null {
  if (!session || typeof session !== "object") return null;

  const state = session as Partial<VoiceSessionState>;
  const candidatesRaw = Array.isArray(state.candidates)
    ? state.candidates
    : undefined;

  const candidates = candidatesRaw?.map((candidate) => ({
    id: candidate.id,
    rank: candidate.rank,
    query: candidate.query,
  }));

  return {
    status: state.status ?? undefined,
    selectedCandidateId: state.selectedCandidateId,
    candidates,
  };
}

export function buildVoiceIntentClassifierPrompt(
  input: VoiceIntentInput,
): string {
  const schema = [
    '  "$schema": "https://json-schema.org/draft/2020-12/schema",',
    '  "type": "object",',
    '  "required": ["intentId", "confidence", "parameters"],',
    '  "properties": {',
    '    "intentId": {',
    '      "type": "string",',
    `      "enum": ${JSON.stringify(VOICE_INTENT_IDS)},`,
    '      "description": "Intent ID in CONSTANT_CASE"',
    "    },",
    '    "confidence": {',
    '      "type": "number",',
    '      "minimum": 0,',
    '      "maximum": 1,',
    '      "description": "Confidence score between 0 and 1"',
    "    },",
    '    "parameters": {',
    '      "type": "object",',
    '      "additionalProperties": true,',
    '      "description": "Key-value pairs required for handling the intent"',
    "    },",
    '    "rationale": {',
    '      "type": "string",',
    '      "maxLength": 160,',
    '      "description": "Optional reasoning (<=160 Japanese characters)"',
    "    },",
    '    "confidenceBand": {',
    '      "type": "string",',
    '      "enum": ["auto", "confirm", "reject"],',
    '      "description": "Optional pre-classified band"',
    "    }",
    "  },",
    '  "additionalProperties": false',
  ];

  const { context } = input;
  const sessionRaw = context?.session ?? null;
  const sessionSummary = buildSessionSummary(sessionRaw);
  const history = Array.isArray(context?.history) ? context.history : [];

  const metadata = {
    confidence: context?.confidence,
    isFinal: context?.isFinal,
    pattern: context?.pattern,
    metadata: context?.metadata,
  };

  return [
    "あなたは音声インターフェースのインテント分類器です。",
    "ユーザーの発話、既存のセッション状態、直近の候補履歴を読み取り、最も適切な Intent を判定してください。",
    temporalContext(),
    "",
    "### 主要Intent候補",
    "- OPTIMIZE_QUERY_APPEND: クエリに追記を加える (初回入力も含む)",
    "- OPTIMIZE_QUERY_REPLACE: 観点を置き換えて候補を再生成",
    "- START_RESEARCH: 選択された候補でリサーチを開始",
    "- CONFIRM_CANDIDATE_SELECTION: 候補の最終選択のみ行う",
    "- CANCEL_OPTIMIZATION: 最適化を中断し初期状態に戻す",
    "",
    "### 出力ルール",
    "1. intentId は対応する CONSTANT_CASE を返す",
    "2. confidence は 0〜1 の浮動小数, auto/confirm/reject の閾値は仕様表に従う",
    "3. parameters には intent が必要とするフィールドのみ含める (例: candidateId, partialText)",
    "4. rationale は 160 文字以内で判断根拠を記述 (任意)",
    "5. JSON Schema に完全に従ったオブジェクトのみ出力する",
    "",
    "### 入力",
    `Transcript: ${input.text}`,
    "",
    "### セッション状態 (要約)",
    safeJson(sessionSummary),
    "",
    "### 直近履歴 (最大3件)",
    safeJson(history),
    "",
    "### メタ情報",
    safeJson(metadata),
    "",
    jsonSchema(schema),
    "",
    "### 出力例",
    JSON.stringify(
      {
        intentId: "START_RESEARCH",
        confidence: 0.92,
        parameters: { candidateId: "cand-1" },
        rationale: "候補を即時リサーチと判断",
      },
      null,
      2,
    ),
  ].join("\n");
}
