/**
 * ProcessVoiceCommandUseCase Factory
 * 音声コマンド処理ユースケースの依存性注入ファクトリー
 */

import { createSpeechToTextAdapter } from "../../infrastructure/external/stt/factory";
import { VoiceDomainService } from "../../domain/voice/services";
import { ProcessVoiceCommandUseCase } from "./index";

export function createProcessVoiceCommandUseCase(): ProcessVoiceCommandUseCase {
  const transcribeClient = createSpeechToTextAdapter();

  const voiceDomainService = new VoiceDomainService();

  return new ProcessVoiceCommandUseCase(transcribeClient, voiceDomainService);
}
