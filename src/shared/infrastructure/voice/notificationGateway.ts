import { InMemoryVoiceNotificationAdapter } from "./inMemoryAdapters";
import type { VoiceNotificationPort } from "@/shared/useCases/ports/voice";

let adapter: VoiceNotificationPort | null = null;

export function getVoiceNotificationAdapter(): VoiceNotificationPort {
  if (!adapter) {
    adapter = new InMemoryVoiceNotificationAdapter();
  }
  return adapter;
}
