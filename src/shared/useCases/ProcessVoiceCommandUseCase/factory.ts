/**
 * ProcessVoiceCommandUseCase Factory
 * 音声コマンド処理ユースケースの依存性注入ファクトリー
 */

import { TranscribeClient } from "../../infrastructure/external/transcribe";
import { VoiceDomainService } from "../../domain/voice/services";
import { ProcessVoiceCommandUseCase } from "./index";

export function createProcessVoiceCommandUseCase(): ProcessVoiceCommandUseCase {
  const transcribeClient = new TranscribeClient({
    region: "us-east-1",
    languageCode: "ja-JP",
    mediaEncoding: "pcm",
    mediaSampleRateHertz: 16000,
    // identityPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_IDENTITY_POOL_ID, // オプション
  });

  const voiceDomainService = new VoiceDomainService();

  return new ProcessVoiceCommandUseCase(transcribeClient, voiceDomainService);
}
