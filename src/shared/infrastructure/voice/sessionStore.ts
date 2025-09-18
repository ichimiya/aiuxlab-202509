import { InMemoryVoiceSessionStore } from "./inMemoryAdapters";
import type { VoiceSessionStorePort } from "@/shared/useCases/ports/voice";

declare global {
  var __voiceSessionStore: VoiceSessionStorePort | undefined;
}

export function getVoiceSessionStore(): VoiceSessionStorePort {
  if (!globalThis.__voiceSessionStore) {
    globalThis.__voiceSessionStore = new InMemoryVoiceSessionStore();
  }
  return globalThis.__voiceSessionStore;
}

export {};
