export type STTConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type STTAlternative = { transcript: string; confidence: number };

export type STTResponse = {
  transcript: string;
  confidence: number;
  isPartial: boolean;
  alternatives?: STTAlternative[];
};

export type STTError = {
  error:
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "invalid-audio"
    | "transcription-failed";
  message: string;
};

export type STTEventHandlers = {
  onTranscriptionResult: (text: string, isFinal: boolean) => void;
  onError: (error: STTError) => void;
  onConnectionStatusChange: (status: STTConnectionStatus) => void;
};

export interface SpeechToTextPort {
  readonly isActive: boolean;
  checkSupport(): boolean;
  requestPermission(): Promise<boolean>;
  setEventHandlers(handlers: STTEventHandlers): void;
  startRealTimeTranscription(): Promise<void>;
  stopTranscription(): Promise<void>;
  transcribeAudio(audio: Blob): Promise<STTResponse>;
}
