import { create } from "zustand";
import {
  useVoiceRecognitionStore,
  type ListeningLifecycleStatus,
  type VoiceSessionStatus,
} from "@/shared/stores/voiceRecognitionStore";

export type AppWindowPhase = "idle" | "optimizing" | "research";

export interface AppWindowDimensions {
  width: string;
  height: string;
}

interface VoiceRecognitionSnapshot {
  listeningStatus: ListeningLifecycleStatus;
  sessionStatus: VoiceSessionStatus | null;
}

interface AppWindowLayoutState {
  phase: AppWindowPhase;
  dimensions: AppWindowDimensions;
  isTransitioning: boolean;
  phaseOverride: AppWindowPhase | null;
  setPhase: (phase: AppWindowPhase) => void;
  setTransitioning: (value: boolean) => void;
  setPhaseOverride: (phase: AppWindowPhase | null) => void;
  syncFromVoiceSnapshot: (snapshot: VoiceRecognitionSnapshot) => void;
  syncFromVoiceRecognition: () => void;
  reset: () => void;
}

const PHASE_DIMENSIONS: Record<AppWindowPhase, AppWindowDimensions> = {
  idle: { width: "390px", height: "165px" },
  optimizing: { width: "max(80vw, 900px)", height: "500px" },
  research: { width: "max(90vw, 1024px)", height: "max(90vh, 768px)" },
};

const initialState: Pick<
  AppWindowLayoutState,
  "phase" | "dimensions" | "isTransitioning" | "phaseOverride"
> = {
  phase: "idle",
  dimensions: PHASE_DIMENSIONS.idle,
  isTransitioning: false,
  phaseOverride: null,
};

const derivePhase = ({
  sessionStatus,
}: VoiceRecognitionSnapshot): AppWindowPhase => {
  if (sessionStatus === "researching") {
    return "research";
  }

  if (sessionStatus === "optimizing" || sessionStatus === "ready") {
    return "optimizing";
  }

  return "idle";
};

const isTransitioningStatus = (status: ListeningLifecycleStatus): boolean =>
  status === "starting" || status === "stopping";

const selectVoiceSnapshot = (
  state: ReturnType<typeof useVoiceRecognitionStore.getState>,
): VoiceRecognitionSnapshot => ({
  listeningStatus: state.listeningStatus,
  sessionStatus: state.sessionState?.status ?? null,
});

export const useAppWindowLayoutStore = create<AppWindowLayoutState>()(
  (set, get) => ({
    ...initialState,
    setPhase: (phase) =>
      set(() => ({
        phase,
        dimensions: PHASE_DIMENSIONS[phase],
      })),
    setTransitioning: (value) =>
      set(() => ({
        isTransitioning: value,
      })),
    setPhaseOverride: (overridePhase) =>
      set(() => {
        if (overridePhase) {
          return {
            phaseOverride: overridePhase,
            phase: overridePhase,
            dimensions: PHASE_DIMENSIONS[overridePhase],
            isTransitioning: false,
          };
        }

        const snapshot = selectVoiceSnapshot(
          useVoiceRecognitionStore.getState(),
        );
        const nextPhase = derivePhase(snapshot);

        return {
          phaseOverride: null,
          phase: nextPhase,
          dimensions: PHASE_DIMENSIONS[nextPhase],
          isTransitioning: isTransitioningStatus(snapshot.listeningStatus),
        };
      }),
    syncFromVoiceSnapshot: (snapshot) => {
      const current = get();
      const nextPhase = current.phaseOverride ?? derivePhase(snapshot);
      const nextDimensions = PHASE_DIMENSIONS[nextPhase];
      const nextTransitioning = current.phaseOverride
        ? false
        : isTransitioningStatus(snapshot.listeningStatus);

      if (
        current.phase === nextPhase &&
        current.dimensions === nextDimensions &&
        current.isTransitioning === nextTransitioning
      ) {
        return;
      }

      set(() => ({
        phase: nextPhase,
        dimensions: nextDimensions,
        isTransitioning: nextTransitioning,
      }));
    },
    syncFromVoiceRecognition: () => {
      const snapshot = selectVoiceSnapshot(useVoiceRecognitionStore.getState());
      get().syncFromVoiceSnapshot(snapshot);
    },
    reset: () =>
      set(() => ({
        ...initialState,
      })),
  }),
);

export const phaseDimensions = PHASE_DIMENSIONS;

useVoiceRecognitionStore.subscribe((state) => {
  const snapshot = selectVoiceSnapshot(state);
  useAppWindowLayoutStore.getState().syncFromVoiceSnapshot(snapshot);
});
