import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { VoicePattern } from "@/shared/api/generated/models";
import type { PendingIntent } from "@/shared/stores/voiceRecognitionStore";

export interface ResearchState {
  selectedText: string;
  voiceCommand: string;
  voiceTranscript: string;
  partialTranscript?: string;
  isListening: boolean;
  currentResearchId: string | null;
  textSelection?: TextSelection;
  recognizedPattern?: VoicePattern;
  intentConfidence?: number;
  pendingIntent: PendingIntent | null;
  voiceCommandHistory: VoiceCommandHistoryEntry[];
}

export interface ResearchActions {
  setSelectedText: (text: string) => void;
  setVoiceCommand: (command: string) => void;
  setVoiceTranscript: (transcript: string) => void;
  setIsListening: (listening: boolean) => void;
  setPartialTranscript: (text: string) => void;
  clearPartialTranscript: () => void;
  setCurrentResearchId: (id: string | null) => void;
  setTextSelection: (payload: TextSelection | undefined) => void;
  clearTextSelection: () => void;
  recordVoiceCommandResult: (entry: VoiceCommandHistoryEntry) => void;
  getVoiceCommandHistory: () => VoiceCommandHistoryEntry[];
  setPendingIntent: (intent: PendingIntent) => void;
  clearPendingIntent: () => void;
  reset: () => void;
}

type ResearchStore = ResearchState & ResearchActions;

const initialState: ResearchState = {
  selectedText: "",
  voiceCommand: "",
  voiceTranscript: "",
  partialTranscript: "",
  isListening: false,
  currentResearchId: null,
  recognizedPattern: undefined,
  intentConfidence: undefined,
  pendingIntent: null,
  voiceCommandHistory: [],
};

export interface TextSelectionMetadata {
  wordCount: number;
  language: "ja" | "en" | "unknown";
  selectionType: "paragraph" | "sentence" | "phrase" | "word";
  url?: string;
  title?: string;
  timestamp: string;
}

export interface TextSelectionOrigin {
  nodeId?: string;
  resultId?: string;
}

export interface TextSelectionSectionContext {
  heading?: string;
  summary?: string;
}

export interface TextSelection {
  text: string;
  context?: string;
  metadata?: TextSelectionMetadata;
  origin?: TextSelectionOrigin;
  section?: TextSelectionSectionContext;
}

export interface VoiceCommandHistoryEntry {
  id: string;
  originalText: string;
  recognizedPattern?: VoicePattern;
  confidence: number;
  timestamp: Date;
  displayText: string;
}

export const useResearchStore = create<ResearchStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setSelectedText: (text) =>
        set(
          (state) => ({ ...state, selectedText: text }),
          false,
          "setSelectedText",
        ),

      setVoiceCommand: (command) =>
        set(
          (state) => ({ ...state, voiceCommand: command }),
          false,
          "setVoiceCommand",
        ),

      setVoiceTranscript: (transcript) =>
        set(
          (state) => ({ ...state, voiceTranscript: transcript }),
          false,
          "setVoiceTranscript",
        ),

      setIsListening: (listening) =>
        set(
          (state) => ({ ...state, isListening: listening }),
          false,
          "setIsListening",
        ),

      setPartialTranscript: (text) =>
        set(
          (state) => ({ ...state, partialTranscript: text }),
          false,
          "setPartialTranscript",
        ),

      clearPartialTranscript: () =>
        set(
          (state) => ({ ...state, partialTranscript: "" }),
          false,
          "clearPartialTranscript",
        ),

      setCurrentResearchId: (id) =>
        set(
          (state) => ({ ...state, currentResearchId: id }),
          false,
          "setCurrentResearchId",
        ),

      setTextSelection: (payload) =>
        set(
          (state) => ({
            ...state,
            textSelection: payload,
            // 既存互換: selectedTextも同期
            selectedText: payload?.text ?? state.selectedText,
          }),
          false,
          "setTextSelection",
        ),

      clearTextSelection: () =>
        set(
          (state) => ({
            ...state,
            textSelection: undefined,
            selectedText: "",
          }),
          false,
          "clearTextSelection",
        ),

      recordVoiceCommandResult: (entry) =>
        set(
          (state) => {
            const normalizedConfidence = Number.isFinite(entry.confidence)
              ? entry.confidence
              : 0;
            const existingIndex = state.voiceCommandHistory.findIndex(
              (item) => item.id === entry.id,
            );

            const nextHistory = (() => {
              if (existingIndex >= 0) {
                const updated = [...state.voiceCommandHistory];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  ...entry,
                  confidence: normalizedConfidence,
                };
                return updated;
              }
              return [
                {
                  ...entry,
                  confidence: normalizedConfidence,
                },
                ...state.voiceCommandHistory,
              ].slice(0, 5);
            })();

            return {
              ...state,
              recognizedPattern: entry.recognizedPattern,
              intentConfidence: normalizedConfidence,
              voiceCommandHistory: nextHistory,
            };
          },
          false,
          "recordVoiceCommandResult",
        ),

      getVoiceCommandHistory: () => get().voiceCommandHistory,

      setPendingIntent: (intent) =>
        set(
          (state) => {
            const nextConfidence = Number.isFinite(intent.confidence)
              ? intent.confidence
              : state.intentConfidence;

            const updatedHistory = state.voiceCommandHistory.length
              ? [
                  {
                    ...state.voiceCommandHistory[0]!,
                    confidence:
                      Number.isFinite(intent.confidence) &&
                      intent.confidence > 0
                        ? intent.confidence
                        : state.voiceCommandHistory[0]!.confidence,
                  },
                  ...state.voiceCommandHistory.slice(1),
                ]
              : state.voiceCommandHistory;

            return {
              ...state,
              pendingIntent: intent,
              intentConfidence: nextConfidence ?? state.intentConfidence,
              voiceCommandHistory: updatedHistory,
            };
          },
          false,
          "setPendingIntent",
        ),

      clearPendingIntent: () =>
        set(
          (state) => ({
            ...state,
            pendingIntent: null,
          }),
          false,
          "clearPendingIntent",
        ),

      reset: () => set(initialState, false, "reset"),
    }),
    {
      name: "research-store",
    },
  ),
);
