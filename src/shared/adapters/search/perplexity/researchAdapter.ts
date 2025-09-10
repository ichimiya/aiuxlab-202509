import OpenAI from "openai";
import type {
  IResearchAPIRepository,
  PerplexityResponse,
  ResearchContext,
} from "@/shared/infrastructure/external/search/types";

export class PerplexityResearchAdapter implements IResearchAPIRepository {
  private readonly client: OpenAI;
  private readonly model: string;
  constructor(cfg: { apiKey: string; model?: string; baseUrl?: string }) {
    this.client = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseUrl || "https://api.perplexity.ai",
    });
    this.model = cfg.model || "sonar";
  }
  async search(context: ResearchContext): Promise<PerplexityResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    const systemPrompt = `あなたは世界最高レベルのリサーチ専門家です。以下の原則に従って包括的なリサーチを実施してください：\n\n【リサーチ原則】\n1. 最新の情報を基に正確で信頼性の高い回答を提供\n2. 出典の明記と引用の適切な付与\n3. ユーザー意図に忠実で過剰な拡張を避ける\n4. 重要なポイントは見出し付きで構造化\n5. 関連する追加の調査観点を提案`;
    messages.push({ role: "system", content: systemPrompt });
    if (context.selectedText) {
      messages.push({
        role: "user",
        content: `【選択されたテキスト】\n${context.selectedText}\n\n【リサーチクエリ】\n${context.query}`,
      });
    } else {
      messages.push({ role: "user", content: context.query });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: 2000,
      temperature: 0.2,
      stream: false,
    } as OpenAI.Chat.ChatCompletionCreateParams);

    return response as unknown as PerplexityResponse;
  }
}
