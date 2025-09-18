import { InMemoryVoiceEventQueue } from "./inMemoryAdapters";
import type { VoiceEventQueuePort } from "@/shared/useCases/ports/voice";
import { processVoiceEvent } from "@/shared/useCases/voiceEvents/processor";

let queue: VoiceEventQueuePort | null = null;

export function getVoiceEventQueue(): VoiceEventQueuePort {
  if (!queue) {
    queue = new InMemoryVoiceEventQueue(processVoiceEvent);
  }
  return queue;
}
