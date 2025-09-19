import type { VoicePattern } from "@/shared/api/generated/models";

export interface VoiceRecognitionUIState {
  isListening: boolean;
  isSupported: boolean;
  hasPermission: boolean;
  volume: number;
  error: string | null;
  status: VoiceRecognitionStatus;
}

export interface VoiceCommandUI {
  id: string;
  timestamp: Date;
  originalText: string;
  recognizedPattern?: VoicePattern;
  confidence: number;
  formattedTime: string;
  displayText: string;
}

export type VoiceRecognitionStatus =
  | "idle"
  | "initializing"
  | "listening"
  | "processing"
  | "error";

export interface VoiceButtonState {
  text: string;
  className: string;
  isDisabled: boolean;
  showIcon: boolean;
}
