import type {
  SpeechToTextPort,
  STTEventHandlers,
  STTResponse,
} from "@/shared/useCases/ports/speechToText";
import { TranscribeClient } from "@/shared/infrastructure/clients/transcribe/transcribeClient";

export class TranscribeAdapter implements SpeechToTextPort {
  private client: TranscribeClient;
  constructor() {
    const region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
    const lang = (process.env.NEXT_PUBLIC_STT_LANG || "ja-JP") as
      | "ja-JP"
      | "en-US";
    const chunkMs =
      Number(process.env.NEXT_PUBLIC_AWS_TRANSCRIBE_CHUNK_MS || "") || 60;
    const lowLatency =
      (process.env.NEXT_PUBLIC_AWS_TRANSCRIBE_LOW_LATENCY || "1") !== "";
    this.client = new TranscribeClient({
      region,
      languageCode: lang,
      chunkMs,
      lowLatency,
    });
  }

  get isActive(): boolean {
    return true;
  }
  checkSupport(): boolean {
    return this.client.checkSupport();
  }
  requestPermission(): Promise<boolean> {
    return this.client.requestPermission();
  }
  setEventHandlers(handlers: STTEventHandlers): void {
    this.client.setHandlers({
      onResult: (t, f) => handlers.onTranscriptionResult?.(t, f),
      onError: (m) =>
        handlers.onError?.({ error: "transcription-failed", message: m }),
      onConnectionStatusChange: (s) => handlers.onConnectionStatusChange?.(s),
    });
  }
  startRealTimeTranscription(): Promise<void> {
    return this.client.start();
  }
  stopTranscription(): Promise<void> {
    return this.client.stop();
  }
  // 単純化のため未対応
  transcribeAudio(audio: Blob): Promise<STTResponse> {
    void audio;
    return Promise.reject(new Error("not implemented"));
  }
}
