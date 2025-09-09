/**
 * ProcessVoiceCommandUseCase
 * 音声コマンド処理のユースケース（Application層）
 */

import type { VoicePattern } from "../../api/generated/models";
import type { SpeechToTextPort, STTResponse } from "../ports/speechToText";
import type { VoiceDomainService } from "../../domain/voice/services";

export interface VoiceCommandResult {
  originalText: string;
  pattern: VoicePattern | null;
  confidence: number;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  isPartial?: boolean;
}

export interface RealTimeVoiceCallback {
  (result: VoiceCommandResult): void;
}

export class ProcessVoiceCommandUseCase {
  constructor(
    private readonly transcribeClient: SpeechToTextPort,
    private readonly voiceDomainService: VoiceDomainService,
  ) {}

  /**
   * 音声Blobを処理してVoiceCommandResultを返す
   */
  async execute(audioInput: Blob): Promise<VoiceCommandResult> {
    try {
      // 1. Infrastructure層でAWS Transcribe呼び出し
      const transcribeResponse =
        await this.transcribeClient.transcribeAudio(audioInput);

      // 2. 音声認識結果を処理
      return this.processTranscribeResponse(transcribeResponse);
    } catch (error) {
      throw new Error(`Voice command processing failed: ${error}`);
    }
  }

  /**
   * リアルタイム音声処理を開始（新API）
   */
  async startRealTimeTranscription(): Promise<void> {
    try {
      await this.transcribeClient.startRealTimeTranscription();
    } catch (error) {
      throw new Error(`Real-time voice processing failed: ${error}`);
    }
  }

  /**
   * リアルタイム音声処理を開始（旧API - 下位互換性のため）
   */
  async processRealTimeAudio(callback: RealTimeVoiceCallback): Promise<void> {
    try {
      // TranscribeClientのイベントハンドラーを設定（新API）
      this.transcribeClient.setEventHandlers({
        onTranscriptionResult: (text: string, isFinal: boolean) => {
          const transcribeResponse: STTResponse = {
            transcript: text,
            confidence: 0.9, // RT出力は信頼度がないため暫定値
            isPartial: !isFinal,
            alternatives: [],
          };
          const result = this.processTranscribeResponse(transcribeResponse);
          callback(result);
        },
        onError: (error) => {
          console.error("Voice recognition error:", error);
          callback({
            originalText: "",
            pattern: null,
            confidence: 0,
            alternatives: [],
            isPartial: false,
          });
        },
        onConnectionStatusChange: () => void 0,
      });

      // リアルタイム転写を開始
      await this.transcribeClient.startRealTimeTranscription();
    } catch (error) {
      throw new Error(`Real-time voice processing failed: ${error}`);
    }
  }

  /**
   * 音声処理を停止
   */
  async stopProcessing(): Promise<void> {
    await this.transcribeClient.stopTranscription();
  }

  /**
   * 音声認識サポート状況を確認
   */
  checkSupport(): boolean {
    return this.transcribeClient.checkSupport();
  }

  /**
   * マイク権限を要求
   */
  async requestPermission(): Promise<boolean> {
    return this.transcribeClient.requestPermission();
  }

  /**
   * 現在の処理状態を取得
   */
  get isProcessing(): boolean {
    return this.transcribeClient.isActive;
  }

  /**
   * Transcribe応答を処理（内部メソッド）
   */
  private processTranscribeResponse(
    transcribeResponse: STTResponse,
  ): VoiceCommandResult {
    const {
      transcript,
      confidence: transcribeConfidence,
      isPartial,
      alternatives,
    } = transcribeResponse;

    // 2. Domain層でビジネスロジック処理
    const parsedCommand = this.voiceDomainService.parseVoiceCommand(transcript);

    // 3. 代替候補がある場合は信頼度を再計算
    let enhancedConfidence = parsedCommand.confidence;
    if (alternatives && alternatives.length > 0) {
      const alternativeConfidence = this.voiceDomainService.calculateConfidence(
        transcript,
        alternatives,
      );

      // パターンマッチングの信頼度と転写信頼度を組み合わせる
      if (!isNaN(alternativeConfidence) && !isNaN(parsedCommand.confidence)) {
        enhancedConfidence =
          (alternativeConfidence + parsedCommand.confidence) / 2;
        console.debug("Combined confidence:", {
          transcribeConfidence,
          alternative: alternativeConfidence,
          enhanced: enhancedConfidence,
        });
      }
    }

    // NaNの場合はデフォルト値を設定
    if (isNaN(enhancedConfidence)) {
      enhancedConfidence = 0.0;
    }

    return {
      originalText: transcript,
      pattern: parsedCommand.pattern,
      confidence: enhancedConfidence,
      alternatives,
      isPartial,
    };
  }

  /**
   * 利用可能な音声パターンを取得
   */
  getAvailablePatterns(): VoicePattern[] {
    return this.voiceDomainService.getAllPatterns();
  }

  /**
   * 特定パターンのキーワードを取得
   */
  getPatternKeywords(pattern: VoicePattern): string[] {
    return this.voiceDomainService.getPatternKeywords(pattern);
  }
}
