/**
 * Perplexity API 設定・定数の一元管理
 *
 * 全ての定数、設定値、プロンプトテンプレートを統合管理し、
 * 各モジュールでの重複を排除する
 */

/**
 * Perplexity API のデフォルト設定
 */
const DEFAULT_API_CONFIG = {
  BASE_URL: "https://api.perplexity.ai",
  MODEL: "sonar",
  TIMEOUT: 30000,
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.2,
} as const;

/**
 * API エンドポイント
 */
const ENDPOINTS = {
  CHAT_COMPLETIONS: "/chat/completions",
} as const;

/**
 * プロンプトテンプレート
 */
const PROMPT_TEMPLATES = {
  SYSTEM_BASE: `あなたは世界最高レベルのリサーチ専門家です。以下の原則に従って包括的なリサーチを実施してください：

【リサーチ手法】
1. 多角的視点: 様々な立場や観点から分析
2. 根拠の明確化: 主張には必ず信頼できる根拠を提示
3. 最新情報重視: 可能な限り最新のデータや動向を反映
4. 批判的思考: 情報の信頼性と限界を評価
5. 実用性考慮: 読者にとって実際に役立つ情報を優先

【回答構造】
- 概要: トピックの核心を簡潔に説明
- 詳細分析: 複数の側面から深く掘り下げ
- 具体例: 実例やケーススタディを含める
- 数値データ: 統計や定量的情報を活用
- トレンド: 最新動向と将来予測
- 実践的示唆: 読者が実際に活用できる知見

【品質基準】
- 専門性: その分野の専門家レベルの知識を提供
- 正確性: 事実確認を徹底し、推測は明確に区別
- 完全性: トピックを網羅的にカバー
- 理解しやすさ: 複雑な内容も分かりやすく説明`,

  SYSTEM_SELECTED_TEXT:
    '\n\n【ユーザー選択テキスト】\n"{{selectedText}}"\n\n上記選択テキストを踏まえ、関連する深い洞察を提供してください。',

  SYSTEM_CLOSING: `\n\n【最終確認事項】
- 引用元は具体的かつ信頼できるソースを使用
- 異なる意見や議論がある場合は両論を紹介
- 最新情報を可能な限り含める
- 実際に役立つ実用的な情報を提供
- 専門用語は適切に解説

高品質で包括的なリサーチレポートを作成してください。`,
} as const;

/**
 * 音声コマンド指示のマッピング - 専門的なリサーチ手法
 */
const VOICE_COMMAND_INSTRUCTIONS = {
  deepdive: `\n\n【深掘りリサーチモード】
- 表面的な情報ではなく、根本的な仕組みや背景を解明
- 専門家レベルの詳細な分析を実施
- 歴史的経緯、発展過程、将来展望を含む
- 関連する学術研究や専門論文の知見を活用
- Why（なぜ）とHow（どのように）を重点的に解説`,

  perspective: `\n\n【多角的分析モード】
- ステークホルダー別の視点（企業、ユーザー、専門家、規制当局など）
- 地域・文化による違いを分析
- 賛成・反対両論を公正に紹介
- 短期・中期・長期の時間軸で評価
- 異なる業界・分野からの知見を統合`,

  concrete: `\n\n【実例重視モード】
- 具体的な企業名、製品名、人名を含むケーススタディ
- 数値データ、統計、調査結果を豊富に活用
- 成功事例と失敗事例の両方を紹介
- Before/After比較で変化を明確化
- 実際の導入事例や実証実験の結果`,

  data: `\n\n【データ分析モード】
- 最新の統計データ、市場調査結果を中心に構成
- グラフや表で表現できるような定量的情報
- トレンドの数値的変化を時系列で分析
- 信頼できる調査機関のデータを引用
- 予測データや将来推計も含める`,

  compare: `\n\n【比較分析モード】
- 複数の選択肢、手法、製品を体系的に比較
- メリット・デメリットを表形式で整理
- 性能、コスト、使いやすさなど多面的に評価
- 競合分析や代替案の検討
- どんな条件でどの選択肢が最適かを明示`,

  trend: `\n\n【トレンド分析モード】
- 2024年以降の最新動向を重点的に調査
- 業界のキーパーソンの発言や予測を含める
- 新技術、新サービス、新制度の影響を分析
- 将来予測と市場予測を具体的に提示
- イノベーションや破壊的変化の可能性を評価`,

  practical: `\n\n【実践ガイドモード】
- すぐに実行できる具体的な手順やステップ
- 必要なツール、リソース、予算を明示
- 注意点、リスク、回避方法を詳述
- 初心者から上級者まで段階別にアドバイス
- 成功のためのベストプラクティスを提供`,

  summary: `\n\n【エグゼクティブサマリーモード】
- 重要なポイントを箇条書きで整理
- 意思決定に必要な情報を優先的に抽出
- アクションアイテムや次のステップを明示
- 時間のない読者向けに効率的に情報伝達
- 詳細情報へのナビゲーションも提供`,
} as const;

/**
 * リサーチサービスの定数
 */
const RESEARCH_CONSTANTS = {
  SOURCE_NAME: "Perplexity AI",
  MIN_RELEVANCE_SCORE: 0.1,
  MAX_RELEVANCE_SCORE: 1.0,
  ID_PREFIX: "research",
  ID_RANDOM_LENGTH: 9,
} as const;

/**
 * エラーメッセージ定数
 */
const ERROR_MESSAGES = {
  API_KEY_REQUIRED: "Perplexity API key is required",
  QUERY_REQUIRED: "Research query is required",
  INVALID_RESPONSE: "Invalid response format",
  EMPTY_RESPONSE: "Empty response received",
  UNKNOWN_ERROR: "Unknown error occurred",
} as const;

/**
 * Perplexity API設定の一元管理クラス
 */
export class PerplexityConfig {
  static readonly DEFAULT_API_CONFIG = DEFAULT_API_CONFIG;
  static readonly ENDPOINTS = ENDPOINTS;
  static readonly PROMPT_TEMPLATES = PROMPT_TEMPLATES;
  static readonly VOICE_COMMAND_INSTRUCTIONS = VOICE_COMMAND_INSTRUCTIONS;
  static readonly RESEARCH_CONSTANTS = RESEARCH_CONSTANTS;
  static readonly ERROR_MESSAGES = ERROR_MESSAGES;

  /**
   * 音声コマンドに対応する指示を取得
   */
  static getVoiceCommandInstruction(voiceCommand?: string): string {
    if (!voiceCommand) return "";

    return (
      VOICE_COMMAND_INSTRUCTIONS[
        voiceCommand as keyof typeof VOICE_COMMAND_INSTRUCTIONS
      ] || ""
    );
  }

  /**
   * システムプロンプトテンプレートを構築
   */
  static buildSystemPrompt(
    selectedText?: string,
    voiceCommand?: string,
  ): string {
    const parts: string[] = [PROMPT_TEMPLATES.SYSTEM_BASE];

    if (selectedText?.trim()) {
      const selectedTextPrompt = PROMPT_TEMPLATES.SYSTEM_SELECTED_TEXT.replace(
        "{{selectedText}}",
        selectedText,
      );
      parts.push(selectedTextPrompt);
    }

    const voiceInstruction = this.getVoiceCommandInstruction(voiceCommand);
    if (voiceInstruction) {
      parts.push(voiceInstruction);
    }

    parts.push(PROMPT_TEMPLATES.SYSTEM_CLOSING);
    return parts.join("");
  }

  /**
   * デフォルト設定と指定設定をマージ
   */
  static mergeConfig<T extends Record<string, unknown>>(
    defaultConfig: T,
    userConfig: Partial<T>,
  ): Required<T> {
    return {
      ...defaultConfig,
      ...userConfig,
    } as Required<T>;
  }

  /**
   * 有効な音声コマンドかどうかを判定
   */
  static isValidVoiceCommand(voiceCommand: string): boolean {
    return voiceCommand in VOICE_COMMAND_INSTRUCTIONS;
  }

  /**
   * スコア値を有効範囲にクランプ
   */
  static clampRelevanceScore(score: number): number {
    return Math.min(
      Math.max(score, RESEARCH_CONSTANTS.MIN_RELEVANCE_SCORE),
      RESEARCH_CONSTANTS.MAX_RELEVANCE_SCORE,
    );
  }
}

/**
 * 型安全な設定値を提供するヘルパー型
 */
export type VoiceCommandType = keyof typeof VOICE_COMMAND_INSTRUCTIONS;
