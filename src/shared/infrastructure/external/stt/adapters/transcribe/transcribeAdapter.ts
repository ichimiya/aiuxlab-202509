import type {
  SpeechToTextPort,
  STTEventHandlers,
  STTResponse,
} from "@/shared/useCases/ports/speechToText";
import { TranscribeClient } from "./internal";

export class TranscribeAdapter implements SpeechToTextPort {
  private readonly client: TranscribeClient;
  constructor(config?: ConstructorParameters<typeof TranscribeClient>[0]) {
    const region =
      config?.region || process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
    const base = {
      region,
      languageCode: (config?.languageCode as "ja-JP" | "en-US") || "ja-JP",
      mediaEncoding:
        (config?.mediaEncoding as "pcm" | "ogg-opus" | "flac") || "pcm",
      mediaSampleRateHertz: config?.mediaSampleRateHertz || 16000,
      accessKeyId: config?.accessKeyId,
      secretAccessKey: config?.secretAccessKey,
    } as const;

    const lowLatency =
      (process.env.NEXT_PUBLIC_AWS_TRANSCRIBE_LOW_LATENCY || "") !== "";
    const targetChunkMs = parseInt(
      process.env.NEXT_PUBLIC_AWS_TRANSCRIBE_CHUNK_MS || "",
      10,
    );
    const opts: NonNullable<ConstructorParameters<typeof TranscribeClient>[1]> =
      {};
    if (lowLatency) opts.chunkWaitMs = 5;
    if (!Number.isNaN(targetChunkMs) && targetChunkMs > 0) {
      opts.targetChunkMs = targetChunkMs;
    }
    const stabilityEnv = (
      process.env.NEXT_PUBLIC_AWS_TRANSCRIBE_STABILITY || ""
    )
      .toString()
      .toLowerCase();
    const stability =
      stabilityEnv === "off" || stabilityEnv === "none"
        ? "off"
        : stabilityEnv === "low"
          ? "low"
          : stabilityEnv === "medium"
            ? "medium"
            : stabilityEnv === "high"
              ? "high"
              : undefined;
    if (stability) opts.stability = stability;

    // Restart-on-final 機能は削除（常に継続セッション）
    this.client = new TranscribeClient(
      base,
      Object.keys(opts).length ? opts : undefined,
    );
  }

  get isActive(): boolean {
    return this.client.isActive;
  }

  checkSupport(): boolean {
    return this.client.checkSupport();
  }

  requestPermission(): Promise<boolean> {
    return this.client.requestPermission();
  }

  setEventHandlers(handlers: STTEventHandlers): void {
    this.client.setEventHandlers(handlers);
  }

  startRealTimeTranscription(): Promise<void> {
    return this.client.startRealTimeTranscription();
  }

  stopTranscription(): Promise<void> {
    return this.client.stopTranscription();
  }

  transcribeAudio(audio: Blob): Promise<STTResponse> {
    return this.client.transcribeAudio(audio);
  }
}
