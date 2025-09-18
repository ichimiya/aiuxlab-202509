import {
  useVoiceRecognitionStore,
  type VoiceRecognitionActions,
  type VoiceRecognitionViewState,
} from "@/shared/stores/voiceRecognitionStore";

export type VoiceRecognitionControls = Pick<
  VoiceRecognitionActions,
  | "setSessionId"
  | "setSessionState"
  | "setError"
  | "clearError"
  | "startListening"
  | "stopListening"
> &
  Pick<VoiceRecognitionViewState, "isListening">;

type VoiceRecognitionStore = VoiceRecognitionViewState &
  VoiceRecognitionActions;

interface SelectionCacheEntry {
  selection: VoiceRecognitionControls;
  signature: VoiceRecognitionControls;
}

const selectionCache = new WeakMap<
  VoiceRecognitionStore,
  SelectionCacheEntry
>();

export const voiceRecognitionSelector = (
  state: VoiceRecognitionStore,
): VoiceRecognitionControls => {
  const signature: VoiceRecognitionControls = {
    setSessionId: state.setSessionId,
    setSessionState: state.setSessionState,
    setError: state.setError,
    clearError: state.clearError,
    isListening: state.isListening,
    startListening: state.startListening,
    stopListening: state.stopListening,
  };

  const cached = selectionCache.get(state);
  if (cached) {
    const signatureChanged = Object.entries(signature).some(
      ([key, value]) =>
        cached.signature[key as keyof VoiceRecognitionControls] !== value,
    );
    if (!signatureChanged) {
      return cached.selection;
    }
  }

  const selection: VoiceRecognitionControls = {
    setSessionId: state.setSessionId,
    setSessionState: state.setSessionState,
    setError: state.setError,
    clearError: state.clearError,
    isListening: state.isListening,
    startListening: state.startListening,
    stopListening: state.stopListening,
  };

  selectionCache.set(state, {
    selection,
    signature,
  });
  return selection;
};

export function useVoiceRecognitionControls(): VoiceRecognitionControls {
  return useVoiceRecognitionStore(voiceRecognitionSelector);
}
