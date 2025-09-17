import type {
  SpeechToTextPort,
  STTEventHandlers,
  STTResponse,
} from "@/shared/useCases/ports/speechToText";
import { TranscribeClient } from "@/shared/infrastructure/clients/transcribe/transcribeClient";

export class TranscribeAdapter implements SpeechToTextPort {
  private client: TranscribeClient;
  private active = false;
  private handlers: STTEventHandlers | null = null;

  constructor() {
    this.client = this.createClient();
  }

  private createClient(): TranscribeClient {
    const region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
    const lang = (process.env.NEXT_PUBLIC_STT_LANG || "ja-JP") as
      | "ja-JP"
      | "en-US";
    const chunkMs =
      Number(process.env.NEXT_PUBLIC_AWS_TRANSCRIBE_CHUNK_MS || "") || 60;
    const lowLatency =
      (process.env.NEXT_PUBLIC_AWS_TRANSCRIBE_LOW_LATENCY || "1") !== "";
    return new TranscribeClient({
      region,
      languageCode: lang,
      chunkMs,
      lowLatency,
    });
  }

  private applyHandlers() {
    if (!this.handlers) return;
    this.client.setHandlers({
      onResult: (t, f) => this.handlers?.onTranscriptionResult?.(t, f),
      onError: (m) =>
        this.handlers?.onError?.({
          error: "transcription-failed",
          message: m,
        }),
      onConnectionStatusChange: (s) =>
        this.handlers?.onConnectionStatusChange?.(s),
    });
  }

  get isActive(): boolean {
    return this.active;
  }
  checkSupport(): boolean {
    return this.client.checkSupport();
  }
  requestPermission(): Promise<boolean> {
    return this.client.requestPermission();
  }
  setEventHandlers(handlers: STTEventHandlers): void {
    this.handlers = handlers;
    this.applyHandlers();
  }
  async startRealTimeTranscription(): Promise<void> {
    try {
      await this.client.start();
      this.active = true;
    } catch (error) {
      this.active = false;
      throw error;
    }
  }
  async stopTranscription(): Promise<void> {
    this.active = false;
    await this.client.stop();
    this.client = this.createClient();
    this.applyHandlers();
  }
  // 単純化のため未対応
  transcribeAudio(audio: Blob): Promise<STTResponse> {
    void audio;
    return Promise.reject(new Error("not implemented"));
  }
}
