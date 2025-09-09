import type {
  SpeechToTextPort,
  STTEventHandlers,
  STTResponse,
} from "@/shared/useCases/ports/speechToText";
import { TranscribeClient } from "@/shared/infrastructure/external/transcribe";

export class TranscribeAdapter implements SpeechToTextPort {
  private readonly client: TranscribeClient;
  constructor(config?: ConstructorParameters<typeof TranscribeClient>[0]) {
    this.client = new TranscribeClient(
      config ?? {
        region: "us-east-1",
        languageCode: "ja-JP",
        mediaEncoding: "pcm",
        mediaSampleRateHertz: 16000,
      },
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
