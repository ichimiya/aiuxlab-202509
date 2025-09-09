import type { SpeechToTextPort } from "@/shared/useCases/ports/speechToText";
import { TranscribeAdapter } from "./adapters/transcribe/transcribeAdapter";

export function createSpeechToTextAdapter(): SpeechToTextPort {
  return new TranscribeAdapter();
}
