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
    const relevanceScore = RelevanceCalculator.calculate(
      context.query,
      choice.message.content,
    );

    return {
      id: IdGenerator.generateResultId(responseId, index),
      content: choice.message.content,
      source: PerplexityConfig.RESEARCH_CONSTANTS.SOURCE_NAME,
      relevanceScore,
      voicePattern: this.mapVoiceCommand(context.voiceCommand),
    };
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
