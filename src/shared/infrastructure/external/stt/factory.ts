import { TranscribeClient } from "@/shared/infrastructure/external/transcribe";

export function createSpeechToTextAdapter() {
  return new TranscribeClient({
    region: "us-east-1",
    languageCode: "ja-JP",
    mediaEncoding: "pcm",
    mediaSampleRateHertz: 16000,
  });
}
