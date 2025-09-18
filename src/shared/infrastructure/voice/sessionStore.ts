import { InMemoryVoiceSessionStore } from "./inMemoryAdapters";
import type { VoiceSessionStorePort } from "@/shared/useCases/ports/voice";

let store: VoiceSessionStorePort | null = null;

export function getVoiceSessionStore(): VoiceSessionStorePort {
  if (!store) {
    store = new InMemoryVoiceSessionStore();
  }
  return store;
}
