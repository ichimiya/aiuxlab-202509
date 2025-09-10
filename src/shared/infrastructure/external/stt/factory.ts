import type { SpeechToTextPort } from "@/shared/useCases/ports/speechToText";
import { TranscribeAdapter } from "./adapters/transcribe/transcribeAdapter";
// simple実装を正式パスへ統合したため、旧simpleは廃止

export function createSpeechToTextAdapter(): SpeechToTextPort {
  return new TranscribeAdapter();
}
