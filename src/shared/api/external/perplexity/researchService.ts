import { PerplexityClient } from "./client";
import type { ResearchContext, PerplexityResponse } from "./types";
import type { Research, ResearchResult } from "../../generated/models";
import type { VoicePattern } from "../../generated/models/voicePattern";
import { ErrorHandler } from "./errorHandler";
import { PerplexityConfig } from "./config";
import { RelevanceCalculator, IdGenerator, ValidationUtils } from "./utils";

/**
 * リサーチ実行サービス
 * Perplexity APIを使用してリサーチを実行し、結果をアプリケーションの形式に変換する
 */
export class ResearchService {
  private readonly client: PerplexityClient;

  constructor(apiKey: string) {
    if (!ValidationUtils.validateApiKey(apiKey)) {
      throw new Error(PerplexityConfig.ERROR_MESSAGES.API_KEY_REQUIRED);
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
    const perplexityError = ErrorHandler.handleError(error);
    throw new Error(`Failed to execute research: ${perplexityError.message}`);
  }

  /**
   * Perplexity APIのレスポンスをResearchオブジェクトに変換
   */
  private transformToResearch(
    context: ResearchContext,
    response: PerplexityResponse,
  ): Research {
    const timestamp = this.getCurrentTimestamp();
    const researchId = IdGenerator.generateResearchId();

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
      this.transformToResearchResult(
        context,
        choice,
        index,
        response.id,
        response,
      ),
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
    response: PerplexityResponse,
  ): ResearchResult {
    const content = choice.message.content || "";
    const relevanceScore = RelevanceCalculator.calculate(
      context.query,
      content,
    );

    // search_resultsから実際のソース情報を抽出
    const primarySource = this.extractPrimarySource(response, index);

    return {
      id: IdGenerator.generateResultId(responseId, index),
      content: content,
      source: primarySource,
      relevanceScore,
      voicePattern: this.mapVoiceCommand(context.voiceCommand),
    };
  }

  /**
   * search_resultsから主要なソース情報を抽出
   */
  private extractPrimarySource(
    response: PerplexityResponse,
    index: number,
  ): string {
    // search_resultsが利用可能な場合、最も関連性の高いソースを使用
    if (response.search_results && response.search_results.length > 0) {
      // インデックスに対応するソースがあれば使用、なければ最初のソース
      const searchResult =
        response.search_results[index] || response.search_results[0];
      return `${searchResult.title} (${new URL(searchResult.url).hostname})`;
    }

    // citationsが利用可能な場合
    if (response.citations && response.citations.length > 0) {
      const citation = response.citations[index] || response.citations[0];
      try {
        return new URL(citation).hostname;
      } catch {
        return citation;
      }
    }

    // フォールバック
    return PerplexityConfig.RESEARCH_CONSTANTS.SOURCE_NAME;
  }

  /**
   * 音声コマンドをVoicePatternにマッピング
   */
  private mapVoiceCommand(voiceCommand?: string): VoicePattern | undefined {
    if (!voiceCommand) {
      return undefined;
    }

    // ValidationUtilsでバリデーションを実行

    return ValidationUtils.validateVoiceCommand(voiceCommand);
  }

  /**
   * 現在のタイムスタンプを取得
   */
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
}
