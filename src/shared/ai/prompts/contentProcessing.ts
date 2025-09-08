import { jsonSchema } from "@/shared/ai/prompts/utils";
import type { ContentProcessingInput } from "@/shared/ai/schemas/contentProcessing";

/**
 * Content Processing 用のプロンプトを共通生成
 * Providerに依存しないポリシーをここに集約する
 */
export function buildContentProcessingPrompt(
  input: ContentProcessingInput,
): string {
  const schema = [
    '  "htmlContent": string,',
    '  "processedCitations": Array<{ id: string; number: number; url: string; title?: string; domain?: string }>',
  ];

  return [
    "あなたは、セマンティックHTMLの専門家です。以下のMarkdownテキストを、意味的に適切な階層構造を持つHTMLに変換してください。",
    "",
    "【セマンティック変換ルール】",
    "1. 見出し階層を正しく設定（h1, h2, h3で文書構造を表現）",
    "2. セクション構造を<section>や<article>で適切にグループ化",
    "3. リスト項目は<ul>, <ol>, <li>で適切に構造化",
    "4. 重要な内容は<strong>, <em>で意味づけ",
    "5. 引用や参考情報は<blockquote>や<cite>を使用",
    '6. [1][2]などの引用番号は <a href="#ref1">[1]</a> のようにリンク化（classは不要）',
    "7. コードは<code>や<pre>で適切にマークアップ",
    "",
    "【引用情報の処理】",
    `Citations: ${JSON.stringify(input.citations || [])}`,
    `SearchResults: ${JSON.stringify(input.searchResults || [])}`,
    "引用番号[1][2]等に対応する情報を上記から抽出し、processedCitationsを生成してください。",
    "",
    "【入力Markdown】",
    input.markdown,
    "",
    jsonSchema(schema),
  ].join("\n");
}
