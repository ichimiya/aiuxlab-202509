/**
 * Voice Domain Services
 * 音声認識に関するビジネスルールとドメインロジック
 */

import type { VoicePattern } from "../../api/generated/models";

// 音声コマンドパターン定義
const VOICE_COMMAND_PATTERNS: Record<VoicePattern, string[]> = {
  deepdive: [
    "詳しく",
    "もっと調べて",
    "deep dive",
    "深掘り",
    "深く",
    "くわしく",
    "さらに",
    "より詳細",
    "もっと詳しく",
  ],
  perspective: [
    "別の観点",
    "違う視点",
    "他の見方",
    "perspective",
    "別角度",
    "異なる視点",
    "他の角度",
    "別の視点",
    "違うアプローチ",
  ],
  concrete: [
    "具体例",
    "事例",
    "実例",
    "concrete",
    "例を",
    "サンプル",
    "具体的",
    "実際の例",
    "ケーススタディ",
  ],
  data: [
    "データ",
    "統計",
    "数字",
    "data",
    "statistics",
    "数値",
    "グラフ",
    "チャート",
    "定量的",
  ],
  compare: [
    "比較",
    "compare",
    "違い",
    "差",
    "対比",
    "比べる",
    "異同",
    "相違点",
    "共通点",
  ],
  trend: [
    "トレンド",
    "傾向",
    "trend",
    "動向",
    "推移",
    "変化",
    "流れ",
    "傾き",
    "趨勢",
  ],
  practical: [
    "実用的",
    "応用",
    "practical",
    "活用",
    "実践",
    "application",
    "使い方",
    "実際に",
    "現実的",
  ],
  summary: [
    "要約",
    "まとめ",
    "サマリ",
    "summary",
    "概要",
    "総括",
    "簡潔に",
    "短く",
    "まとめて",
  ],
} as const;

export interface VoiceCommandResult {
  pattern: VoicePattern | null;
  confidence: number;
}

export interface VoiceAlternative {
  transcript: string;
  confidence: number;
}

export class VoiceDomainService {
  /**
   * 音声コマンドをVoicePatternに分類（ドメインルール）
   */
  parseVoiceCommand(transcript: string): VoiceCommandResult {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error("Invalid voice command");
    }

    const normalizedInput = this.normalizeVoiceInput(transcript);
    let bestMatch: VoicePattern | null = null;
    let maxScore = 0;

    // 各パターンに対してマッチング度を計算
    for (const [pattern, keywords] of Object.entries(
      VOICE_COMMAND_PATTERNS,
    ) as Array<[VoicePattern, string[]]>) {
      const score = this.calculatePatternScore(normalizedInput, keywords);
      if (score > maxScore) {
        maxScore = score;
        bestMatch = pattern;
      }
    }

    // 最小信頼度を下回る場合はnullを返す
    const confidence = this.normalizeConfidence(maxScore);
    const minConfidence = 0.4;

    return {
      pattern: confidence >= minConfidence ? bestMatch : null,
      confidence,
    };
  }

  /**
   * 信頼度を計算（ドメインロジック）
   */
  calculateConfidence(
    transcript: string,
    alternatives: VoiceAlternative[],
  ): number {
    if (alternatives.length === 0) {
      return 0.5;
    }

    // 最も高い信頼度を基準とする
    const maxAltConfidence = Math.max(
      ...alternatives.map((alt) => alt.confidence),
    );

    // 完全一致の場合は高い信頼度
    const exactMatch = alternatives.find(
      (alt) => alt.transcript === transcript,
    );
    if (exactMatch) {
      return Math.min(exactMatch.confidence * 1.1, 1.0);
    }

    // 部分一致の評価
    let partialMatchScore = 0;
    alternatives.forEach((alt) => {
      if (
        transcript.includes(alt.transcript) ||
        alt.transcript.includes(transcript)
      ) {
        partialMatchScore = Math.max(partialMatchScore, alt.confidence * 0.8);
      }
    });

    return Math.max(maxAltConfidence * 0.9, partialMatchScore);
  }

  /**
   * 音声入力の正規化（ドメインルール）
   */
  normalizeVoiceInput(transcript: string): string {
    return transcript
      .replace(/[、。！？,!?]/g, " ") // 句読点をスペースに変換
      .replace(/\s+/g, " ") // 複数スペースを単一スペースに
      .toLowerCase() // 英語を小文字に
      .trim(); // 前後の空白を除去
  }

  /**
   * 利用可能な全パターンを取得
   */
  getAllPatterns(): VoicePattern[] {
    return Object.keys(VOICE_COMMAND_PATTERNS) as VoicePattern[];
  }

  /**
   * パターンのキーワードを取得
   */
  getPatternKeywords(pattern: VoicePattern): string[] {
    return VOICE_COMMAND_PATTERNS[pattern] || [];
  }

  /**
   * パターンマッチングスコアを計算（内部メソッド）
   */
  private calculatePatternScore(input: string, keywords: string[]): number {
    let maxScore = 0;

    keywords.forEach((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();

      // 完全一致
      if (input === normalizedKeyword) {
        maxScore = Math.max(maxScore, 1.0);
      }
      // 部分一致
      else if (
        input.includes(normalizedKeyword) ||
        normalizedKeyword.includes(input)
      ) {
        maxScore = Math.max(maxScore, 0.8);
      }
      // 曖昧一致（文字列の類似度チェック）
      else if (this.calculateSimilarity(input, normalizedKeyword) > 0.7) {
        maxScore = Math.max(maxScore, 0.6);
      }
    });

    return maxScore;
  }

  /**
   * 文字列類似度を計算（レーベンシュタイン距離ベース）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * レーベンシュタイン距離を計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * スコアを0-1の信頼度に正規化
   */
  private normalizeConfidence(score: number): number {
    // スコアを0-1の範囲にマッピング（より緩やかな変換）
    return Math.min(Math.max(score * 2.0, 0), 1);
  }
}
