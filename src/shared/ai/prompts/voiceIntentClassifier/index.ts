import requestSchema from "./request.json";
import responseSchema from "./response.json";
import { jsonSchema, temporalContext } from "@/shared/ai/prompts/utils";
import { VOICE_INTENT_IDS } from "@/shared/domain/voice/intents";
import type {
  VoiceIntentInput,
  VoiceSessionState,
} from "@/shared/useCases/ports/voice";

type VoiceSessionSummary = {
  status?: VoiceSessionState["status"];
  selectedCandidateId?: VoiceSessionState["selectedCandidateId"];
  candidates?: Array<{
    id?: unknown;
    rank?: unknown;
    query?: unknown;
  }>;
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

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

function schemaLines(schema: unknown): string[] {
  return JSON.stringify(schema, null, 2).split("\n").slice(1, -1);
}

export interface VoiceIntentClassifierPrompt {
  system: string;
  user: string;
}

export function buildVoiceIntentClassifierPrompt(
  input: VoiceIntentInput,
): VoiceIntentClassifierPrompt {
  const { context } = input;
  const sessionSummary = buildSessionSummary(context?.session ?? null);
  const history = Array.isArray(context?.history) ? context.history : [];

  const metadata = {
    confidence: context?.confidence,
    isFinal: context?.isFinal,
    pattern: context?.pattern,
    metadata: context?.metadata,
  };

  const responseSchemaLines = schemaLines(responseSchema);
  const requestSchemaString = JSON.stringify(requestSchema, null, 2);

  const systemPrompt = [
    "あなたは音声インターフェースのインテント分類器です。",
    "ユーザーの発話、既存のセッション状態、直近の候補履歴を読み取り、最も適切な Intent を判定してください。",
    temporalContext(),
    "",
    "### 主要Intent候補",
    ...VOICE_INTENT_IDS.map(
      (intentId) => `- ${intentId}: ${intentDescription(intentId)}`,
    ),
    "",
    "### 入力スキーマ",
    JSON.stringify(requestSchema, null, 2),
    "",
    "### 出力ルール",
    "1. intentId は必ず列挙済みの CONSTANT_CASE を返す",
    "2. confidence は 0〜1 の浮動小数。auto/confirm/reject の閾値は仕様表に従う",
    "3. parameters にはインテントが必要とするフィールドのみ含める (例: candidateId, partialText)",
    "4. rationale は 160 文字以内で判定理由を要約 (任意)",
    "5. 応答は JSON Schema に完全準拠させ、追加フィールドを含めない",
    "",
    jsonSchema(responseSchemaLines),
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

  const userPayload = {
    transcript: input.text,
    sessionSummary,
    history,
    metadata,
  };

  return {
    system: systemPrompt,
    user: JSON.stringify(userPayload, null, 2),
  };
}

function intentDescription(
  intentId: (typeof VOICE_INTENT_IDS)[number],
): string {
  switch (intentId) {
    case "OPTIMIZE_QUERY_APPEND":
      return "クエリに追記を加える (初回入力も含む)";
    case "OPTIMIZE_QUERY_REPLACE":
      return "観点を置き換えて候補を再生成";
    case "START_RESEARCH":
      return "選択された候補でリサーチを開始";
    case "CONFIRM_CANDIDATE_SELECTION":
      return "候補の最終選択のみ行う";
    case "CANCEL_OPTIMIZATION":
      return "最適化を中断し初期状態に戻す";
    default:
      return "";
  }
}

export type { VoiceSessionSummary };
