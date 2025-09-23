import type { TextSelection } from "@/shared/stores/researchStore";
import type { SelectionInsightTopic } from "@/shared/ai/schemas/selectionInsights";
import { jsonSchema, temporalContext } from "@/shared/ai/prompts/utils";

interface BuildSelectionInsightTopicPromptInput {
  researchId: string;
  selection: TextSelection;
  requestedTopics?: number;
}

interface BuildSelectionInsightExpansionPromptInput {
  researchId: string;
  selection: TextSelection;
  topics: SelectionInsightTopic[];
}

function formatMetadata(selection: TextSelection): string[] {
  if (!selection.metadata) return [];
  const { metadata } = selection;
  const lines = ["### SELECTION_METADATA"];
  if (metadata.selectionType)
    lines.push(`SELECTION_TYPE: ${metadata.selectionType}`);
  if (metadata.language) lines.push(`DETECTED_LANGUAGE: ${metadata.language}`);
  if (typeof metadata.wordCount === "number")
    lines.push(`WORD_COUNT: ${metadata.wordCount}`);
  if (metadata.url) lines.push(`SOURCE_URL: ${metadata.url}`);
  if (metadata.title) lines.push(`SOURCE_TITLE: ${metadata.title}`);
  if (metadata.timestamp) lines.push(`CAPTURED_AT: ${metadata.timestamp}`);
  return lines;
}

export function buildSelectionInsightTopicPrompt({
  researchId,
  selection,
  requestedTopics = 3,
}: BuildSelectionInsightTopicPromptInput): string {
  const schema = [
    '  "topics": Array<{',
    "    id: string,",
    "    title: string,",
    "    objective: string,",
    '    priority: "high" | "medium" | "low",',
    "    guidingQuestions: Array<string>",
    "  }>",
  ];

  return [
    "あなたは企業調査レポートのプランナーです。",
    "選択されたテキストからレポートの不足情報を抽出し、優先度付きのフォローアップトピックを設計してください。",
    "提示するトピック数は最大" +
      requestedTopics +
      "件。優先度は high / medium / low のいずれか。",
    "各トピックには目的と、深掘りに使える具体的なガイディングクエスチョンを含めてください。",
    temporalContext(),
    "",
    "### RESEARCH_IDENTIFIER",
    researchId,
    "",
    "### SELECTED_TEXT",
    selection.text,
    "",
    selection.context ? "### SURROUNDING_CONTEXT\n" + selection.context : "",
    ...formatMetadata(selection),
    "",
    jsonSchema(schema),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSelectionInsightExpansionPrompt({
  researchId,
  selection,
  topics,
}: BuildSelectionInsightExpansionPromptInput): string {
  const schema = [
    '  "summary": string,',
    '  "insights": Array<{',
    "    id: string,",
    "    title: string,",
    "    summary: string,",
    "    keyPoints: Array<{ label: string; detail?: string }>,",
    "    recommendedSources: Array<{ title: string; url: string; reason?: string }>",
    "  }>",
    '  "generatedAt"?: string',
  ];

  return [
    "あなたはフォローアップ調査を行う企業調査アナリストです。",
    "以下のトピックごとに追加調査を実行した体で、信頼性の高い補足知見を生成してください。",
    "知見は日本語でまとめ、過度な仮定や空想は避ける。",
    "引用候補URLが不明な場合は信頼できる公開リソースを推測し、補足理由を付記。",
    temporalContext(),
    "",
    "### RESEARCH_IDENTIFIER",
    researchId,
    "",
    "### SELECTED_TEXT",
    selection.text,
    "",
    selection.context ? "### SURROUNDING_CONTEXT\n" + selection.context : "",
    ...formatMetadata(selection),
    "",
    "### FOLLOWUP_TOPICS_JSON",
    JSON.stringify(topics, null, 2),
    "",
    "### 出力要件",
    "- summary: トピック全体で得られた補足知見を2-3文で要約",
    "- insights: 各トピックに対応した詳細。insights[].id は入力トピックの id と一致させる",
    "- keyPoints: 2-3個の重要ポイント。detailは省略可",
    "- recommendedSources: 追加リサーチで参考になる公開ソース（最大3件）。URLが不確かな場合は信頼できる候補を推奨し、reasonで用途を説明",
    "- 出力は厳密なJSONのみ。コードブロックは禁止",
    "",
    jsonSchema(schema),
  ]
    .filter(Boolean)
    .join("\n");
}
