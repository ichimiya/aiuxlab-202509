import { createVoiceIntentClassifier } from "@/shared/infrastructure/external/llm/factory";
import type { VoiceIntentClassifierPort } from "@/shared/useCases/ports/voice";

declare global {
  var __voiceIntentClassifier: VoiceIntentClassifierPort | undefined;
}

export function getVoiceIntentClassifier(): VoiceIntentClassifierPort {
  if (!globalThis.__voiceIntentClassifier) {
    globalThis.__voiceIntentClassifier = createVoiceIntentClassifier();
  }
  return globalThis.__voiceIntentClassifier;
}

export {};
