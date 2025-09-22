import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { OptimizationCandidate } from "@/shared/api/generated/models";

export type VoiceSessionStatus =
  | "idle"
  | "optimizing"
  | "ready"
  | "researching";

export interface VoiceCandidateSnapshot extends OptimizationCandidate {
  rank: number;
  source: "llm" | "manual";
}

export interface VoiceSessionState {
  sessionId: string;
  status: VoiceSessionStatus;
  candidates: VoiceCandidateSnapshot[];
  selectedCandidateId?: string;
  currentQuery?: string;
  latestTranscript?: string;
  evaluationSummary?: string;
  lastUpdatedAt: string;
  pendingIntent?: PendingIntent | null;
}

export interface PendingIntent {
  intentId: string;
  confidence: number;
  parameters: Record<string, unknown>;
  expiresAt: string;
}

export interface VoiceRecognitionViewState {
  sessionId: string | null;
  sessionState: VoiceSessionState | null;
  pendingIntent: PendingIntent | null;
  lastError: string | null;
  reconnectAttempt: number;
  isSseConnected: boolean;
  isListening: boolean;
  listeningStatus: ListeningLifecycleStatus;
}

export interface VoiceRecognitionActions {
  setSessionId: (sessionId: string | null) => void;
  applySessionUpdate: (update: VoiceSessionState) => void;
  setSessionState: (state: VoiceSessionState | null) => void;
  setPendingIntent: (intent: PendingIntent) => void;
  clearPendingIntent: () => void;
  setError: (message: string) => void;
  clearError: () => void;
  setSseConnected: (connected: boolean) => void;
  incrementReconnectAttempt: () => void;
  resetReconnectAttempt: () => void;
  startListening: () => void;
  stopListening: () => void;
  setListeningStatus: (status: ListeningLifecycleStatus) => void;
  reset: () => void;
}

type VoiceRecognitionStore = VoiceRecognitionViewState &
  VoiceRecognitionActions;

export type ListeningLifecycleStatus =
  | "idle"
  | "starting"
  | "active"
  | "stopping"
  | "error";

const initialState: VoiceRecognitionViewState = {
  sessionId: null,
  sessionState: null,
  pendingIntent: null,
  lastError: null,
  reconnectAttempt: 0,
  isSseConnected: false,
  isListening: false,
  listeningStatus: "idle",
};

export const useVoiceRecognitionStore = create<VoiceRecognitionStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setSessionId: (sessionId) =>
        set(
          (state) => ({
            ...state,
            sessionId,
            // セッションIDが変わった場合はセッション情報をリセット
            sessionState:
              sessionId && state.sessionState?.sessionId === sessionId
                ? state.sessionState
                : null,
          }),
          false,
          "setSessionId",
        ),

      applySessionUpdate: (update) =>
        set(
          (state) => {
            if (
              state.sessionState &&
              state.sessionState.sessionId === update.sessionId
            ) {
              return {
                ...state,
                sessionState: {
                  ...state.sessionState,
                  ...update,
                  candidates: update.candidates,
                },
              };
            }

            return {
              ...state,
              sessionState: update,
              sessionId: update.sessionId,
            };
          },
          false,
          "applySessionUpdate",
        ),

      setSessionState: (sessionState) =>
        set(
          (state) => ({
            ...state,
            sessionState,
            sessionId: sessionState?.sessionId ?? state.sessionId,
          }),
          false,
          "setSessionState",
        ),

      setPendingIntent: (intent) =>
        set(
          (state) => ({
            ...state,
            pendingIntent: intent,
          }),
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

      setError: (message) =>
        set(
          (state) => ({
            ...state,
            lastError: message,
          }),
          false,
          "setError",
        ),

      clearError: () =>
        set(
          (state) => ({
            ...state,
            lastError: null,
          }),
          false,
          "clearError",
        ),

      setSseConnected: (connected) =>
        set(
          (state) => ({
            ...state,
            isSseConnected: connected,
          }),
          false,
          "setSseConnected",
        ),

      incrementReconnectAttempt: () =>
        set(
          (state) => ({
            ...state,
            reconnectAttempt: state.reconnectAttempt + 1,
          }),
          false,
          "incrementReconnectAttempt",
        ),

      resetReconnectAttempt: () =>
        set(
          (state) => ({
            ...state,
            reconnectAttempt: 0,
          }),
          false,
          "resetReconnectAttempt",
        ),

      startListening: () =>
        set(
          (state) => ({
            ...state,
            isListening: true,
            listeningStatus: "active",
          }),
          false,
          "startListening",
        ),

      stopListening: () =>
        set(
          (state) => ({
            ...state,
            isListening: false,
            listeningStatus: "idle",
          }),
          false,
          "stopListening",
        ),

      setListeningStatus: (status) =>
        set(
          (state) => ({
            ...state,
            listeningStatus: status,
            isListening:
              status === "active"
                ? true
                : status === "idle" || status === "error"
                  ? false
                  : state.isListening,
          }),
          false,
          "setListeningStatus",
        ),

      reset: () => set(initialState, false, "reset"),
    }),
    {
      name: "voice-recognition-store",
    },
  ),
);
