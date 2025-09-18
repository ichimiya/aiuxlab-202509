import { InMemoryVoiceNotificationAdapter } from "./inMemoryAdapters";
import type { VoiceNotificationPort } from "@/shared/useCases/ports/voice";

declare global {
  var __voiceNotificationAdapter: VoiceNotificationPort | undefined;
}

export function getVoiceNotificationAdapter(): VoiceNotificationPort {
  if (!globalThis.__voiceNotificationAdapter) {
    globalThis.__voiceNotificationAdapter =
      new InMemoryVoiceNotificationAdapter();
  }
  return globalThis.__voiceNotificationAdapter;
}

export {};
