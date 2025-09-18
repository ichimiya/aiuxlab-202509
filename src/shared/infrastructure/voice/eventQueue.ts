import { InMemoryVoiceEventQueue } from "./inMemoryAdapters";
import type { VoiceEventQueuePort } from "@/shared/useCases/ports/voice";
import { processVoiceEvent } from "@/shared/useCases/voiceEvents/processor";

declare global {
  var __voiceEventQueue: VoiceEventQueuePort | undefined;
}

export function getVoiceEventQueue(): VoiceEventQueuePort {
  if (!globalThis.__voiceEventQueue) {
    globalThis.__voiceEventQueue = new InMemoryVoiceEventQueue(
      processVoiceEvent,
    );
  }
  return globalThis.__voiceEventQueue;
}

export {};
