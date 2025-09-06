export function temporalContext(now: Date = new Date()): string {
  const y = now.getFullYear();
  const recentRange = `${y - 2}–${y}`;
  const todayIso = now.toISOString().slice(0, 10);
  return [
    "### TEMPORAL_CONTEXT",
    `TODAY: ${todayIso}`,
    `CURRENT_YEAR: ${y}`,
    `PREV_YEAR: ${y - 1}`,
    `RECENT_RANGE: ${recentRange}`,
  ].join("\n");
}

export function expansionPolicy(
  mode: "minimal" | "balanced" | "exploratory" = "minimal",
): string {
  const lines = ["### EXPANSION_POLICY", `MODE: ${mode}`];
  if (mode === "minimal") {
    lines.push(
      "- 必須の明確化のみ（年・対象範囲・固有名詞の正規化）",
      "- 過剰な拡張を禁止（例: 地域分布・比較・要因分析などの派生カテゴリは、明示指示がない限り追加しない）",
      "- 追加観点は最大1件。不要なら0件。",
      "- ‘一覧’や‘定義’などユーザー意図が明確な場合は、その意図に忠実な最小表現に留める",
    );
  }
  return lines.join("\n");
}

export function jsonSchema(schemaLines: string[]): string {
  return [
    "### OUTPUT_JSON_SCHEMA",
    "{",
    ...schemaLines,
    "}",
    "",
    "### OUTPUT_JSON_ONLY",
    "- 厳密なJSONのみを1つ返す（プレーンテキスト・注釈・コードブロック・説明は一切禁止）",
    "- keyはスキーマ項目のみ。順序は任意。値は空文字でも可。",
    "- confidenceなどの数値は0.0〜1.0の小数など、指示があれば従う",
  ].join("\n");
}
