import { PerplexityClient } from "./client";
import type { ResearchContext, PerplexityResponse } from "./types";
import type { Research, ResearchResult } from "../../generated/models";
import type { VoicePattern } from "../../generated/models/voicePattern";

/**
 * リサーチ実行サービス
 * Perplexity APIを使用してリサーチを実行し、結果をアプリケーションの形式に変換する
 */
/**
 * ResearchService設定定数
 */
const RESEARCH_CONSTANTS = {
  SOURCE_NAME: "Perplexity AI",
  MIN_RELEVANCE_SCORE: 0.1,
  MAX_RELEVANCE_SCORE: 1.0,
  ID_PREFIX: "research",
  ID_RANDOM_LENGTH: 9,
} as const;

/**
 * リサーチ実行サービス
 * Perplexity APIを使用してリサーチを実行し、結果をアプリケーションの形式に変換する
 */
export class ResearchService {
  private readonly client: PerplexityClient;

  constructor(apiKey: string) {
    if (!apiKey?.trim()) {
      throw new Error("Perplexity API key is required");
    }

    this.client = new PerplexityClient({
      apiKey,
    });
  }

  /**
   * リサーチを実行する
   */
  async executeResearch(context: ResearchContext): Promise<Research> {
    try {
      const perplexityResponse = await this.client.search(context);
      return this.transformToResearch(context, perplexityResponse);
    } catch (error) {
      return this.handleResearchError(context, error);
    }
  }

  /**
   * リサーチエラーハンドリング
   */
  private handleResearchError(context: ResearchContext, error: unknown): never {
    const errorMessage = this.extractErrorMessage(error);
    throw new Error(`Failed to execute research: ${errorMessage}`);
  }

  /**
   * エラーメッセージを抽出
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown error occurred";
  }

  /**
   * Perplexity APIのレスポンスをResearchオブジェクトに変換
   */
  private transformToResearch(
    context: ResearchContext,
    response: PerplexityResponse,
  ): Research {
    const timestamp = this.getCurrentTimestamp();
    const researchId = this.generateResearchId();

    if (this.isEmptyResponse(response)) {
      return this.createFailedResearch(context, researchId, timestamp);
    }

    return this.createSuccessfulResearch(
      context,
      response,
      researchId,
      timestamp,
    );
  }

  /**
   * レスポンスが空かどうかを判定
   */
  private isEmptyResponse(response: PerplexityResponse): boolean {
    return !response.choices || response.choices.length === 0;
  }

  /**
   * 失敗したリサーチオブジェクトを作成
   */
  private createFailedResearch(
    context: ResearchContext,
    id: string,
    timestamp: string,
  ): Research {
    return {
      id,
      query: context.query,
      status: "failed",
      results: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * 成功したリサーチオブジェクトを作成
   */
  private createSuccessfulResearch(
    context: ResearchContext,
    response: PerplexityResponse,
    id: string,
    timestamp: string,
  ): Research {
    const results = response.choices.map((choice, index) =>
      this.transformToResearchResult(context, choice, index, response.id),
    );

    return {
      id,
      query: context.query,
      status: "completed",
      results,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * Perplexityの選択肢をResearchResultに変換
   */
  private transformToResearchResult(
    context: ResearchContext,
    choice: PerplexityResponse["choices"][0],
    index: number,
    responseId: string,
  ): ResearchResult {
    const relevanceScore = this.calculateRelevanceScore(
      context.query,
      choice.message.content,
    );

    return {
      id: this.generateResultId(responseId, index),
      content: choice.message.content,
      source: RESEARCH_CONSTANTS.SOURCE_NAME,
      relevanceScore,
      voicePattern: this.mapVoiceCommand(context.voiceCommand),
    };
  }

  /**
   * 結果IDを生成
   */
  private generateResultId(responseId: string, index: number): string {
    return `${responseId}-${index}`;
  }

  /**
   * 音声コマンドをVoicePatternにマッピング
   */
  private mapVoiceCommand(voiceCommand?: string): VoicePattern | undefined {
    if (!voiceCommand) {
      return undefined;
    }

    // 有効なVoicePatternかチェック
    const validPatterns: Record<string, VoicePattern> = {
      deepdive: "deepdive",
      perspective: "perspective",
      concrete: "concrete",
      data: "data",
      compare: "compare",
      trend: "trend",
      practical: "practical",
      summary: "summary",
    };

    return validPatterns[voiceCommand];
  }

  /**
   * 関連度スコアを計算（改良版）
   * クエリキーワードとコンテンツの類似度を計算
   */
  private calculateRelevanceScore(query: string, content: string): number {
    if (!query?.trim() || !content?.trim()) {
      return RESEARCH_CONSTANTS.MIN_RELEVANCE_SCORE;
    }

    const queryWords = this.tokenizeText(query);
    const contentWords = this.tokenizeText(content);

    if (queryWords.length === 0) {
      return RESEARCH_CONSTANTS.MIN_RELEVANCE_SCORE;
    }

    // 完全一致と部分一致の両方を考慮
    const exactMatches = this.countExactMatches(queryWords, contentWords);
    const partialMatches = this.countPartialMatches(queryWords, contentWords);

    // 重み付きスコア計算
    const exactWeight = 1.0;
    const partialWeight = 0.5;
    const totalWeight = exactWeight + partialWeight;

    const score =
      (exactMatches * exactWeight + partialMatches * partialWeight) /
      (queryWords.length * totalWeight);

    return this.clampScore(score);
  }

  /**
   * テキストをトークン化
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // 記号を空白に置換
      .split(/\s+/)
      .filter((word) => word.length > 1); // 1文字の単語を除外
  }

  /**
   * 完全一致の数をカウント
   */
  private countExactMatches(
    queryWords: string[],
    contentWords: string[],
  ): number {
    return queryWords.filter((word) => contentWords.includes(word)).length;
  }

  /**
   * 部分一致の数をカウント
   */
  private countPartialMatches(
    queryWords: string[],
    contentWords: string[],
  ): number {
    return queryWords.filter((queryWord) =>
      contentWords.some(
        (contentWord) =>
          queryWord !== contentWord && // 完全一致は除外
          (contentWord.includes(queryWord) || queryWord.includes(contentWord)),
      ),
    ).length;
  }

  /**
   * スコアを有効範囲にクランプ
   */
  private clampScore(score: number): number {
    return Math.min(
      Math.max(score, RESEARCH_CONSTANTS.MIN_RELEVANCE_SCORE),
      RESEARCH_CONSTANTS.MAX_RELEVANCE_SCORE,
    );
  }

  /**
   * 現在のタイムスタンプを取得
   */
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 一意なリサーチIDを生成
   */
  private generateResearchId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random()
      .toString(36)
      .substr(2, RESEARCH_CONSTANTS.ID_RANDOM_LENGTH);

    return `${RESEARCH_CONSTANTS.ID_PREFIX}-${timestamp}-${randomSuffix}`;
  }
}
