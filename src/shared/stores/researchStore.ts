import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface ResearchState {
  selectedText: string;
  voiceCommand: string;
  partialTranscript?: string;
  isListening: boolean;
  currentResearchId: string | null;
  textSelection?: TextSelection;
}

export interface ResearchActions {
  setSelectedText: (text: string) => void;
  setVoiceCommand: (command: string) => void;
  setIsListening: (listening: boolean) => void;
  setPartialTranscript: (text: string) => void;
  clearPartialTranscript: () => void;
  setCurrentResearchId: (id: string | null) => void;
  setTextSelection: (payload: TextSelection | undefined) => void;
  clearTextSelection: () => void;
  reset: () => void;
}

type ResearchStore = ResearchState & ResearchActions;

const initialState: ResearchState = {
  selectedText: "",
  voiceCommand: "",
  partialTranscript: "",
  isListening: false,
  currentResearchId: null,
};

export interface TextSelectionMetadata {
  wordCount: number;
  language: "ja" | "en" | "unknown";
  selectionType: "paragraph" | "sentence" | "phrase" | "word";
  url?: string;
  title?: string;
  timestamp: string;
}

export interface TextSelection {
  text: string;
  context?: string;
  metadata?: TextSelectionMetadata;
}

export const useResearchStore = create<ResearchStore>()(
  devtools(
    (set) => ({
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

      reset: () => set(initialState, false, "reset"),
    }),
    {
      name: "research-store",
    },
  ),
);
