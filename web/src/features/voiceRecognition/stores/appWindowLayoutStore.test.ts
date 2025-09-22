import { beforeEach, describe, expect, it } from "vitest";
import {
  useAppWindowLayoutStore,
  phaseDimensions,
} from "./appWindowLayoutStore";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";
import type {
  ListeningLifecycleStatus,
  VoiceSessionStatus,
} from "@/shared/stores/voiceRecognitionStore";

const getLayoutState = () => useAppWindowLayoutStore.getState();

const updateVoiceStore = (updates: {
  listeningStatus?: ListeningLifecycleStatus;
  sessionStatus?: VoiceSessionStatus;
}) => {
  const voiceStore = useVoiceRecognitionStore.getState();

  if (updates.listeningStatus) {
    voiceStore.setListeningStatus(updates.listeningStatus);
  }

  if (updates.sessionStatus) {
    voiceStore.setSessionState({
      sessionId: "session-test",
      status: updates.sessionStatus,
      candidates: [],
      lastUpdatedAt: new Date().toISOString(),
    });
  }
};

describe("appWindowLayoutStore", () => {
  beforeEach(() => {
    useVoiceRecognitionStore.getState().reset();
    useAppWindowLayoutStore.getState().reset();
  });

  it("初期状態ではidleフェーズと固定サイズを持つ", () => {
    const state = getLayoutState();
    expect(state.phase).toBe("idle");
    expect(state.dimensions).toEqual(phaseDimensions.idle);
    expect(state.isTransitioning).toBe(false);
  });

  it("音声認識開始だけではidleフェーズを維持しつつ移行フラグを立てる", () => {
    updateVoiceStore({ listeningStatus: "starting" });
    const state = getLayoutState();
    expect(state.phase).toBe("idle");
    expect(state.dimensions).toEqual(phaseDimensions.idle);
    expect(state.isTransitioning).toBe(true);
  });

  it("セッションがoptimizingになるとoptimizingフェーズへ遷移する", () => {
    updateVoiceStore({
      sessionStatus: "optimizing",
    });
    const state = getLayoutState();
    expect(state.phase).toBe("optimizing");
    expect(state.dimensions).toEqual(phaseDimensions.optimizing);
    expect(state.isTransitioning).toBe(false);
  });

  it("セッションがreadyでもoptimizingフェーズを維持する", () => {
    updateVoiceStore({ sessionStatus: "ready" });
    const state = getLayoutState();
    expect(state.phase).toBe("optimizing");
    expect(state.dimensions).toEqual(phaseDimensions.optimizing);
    expect(state.isTransitioning).toBe(false);
  });

  it("セッションがresearchingになるとresearchフェーズのサイズに切り替わる", () => {
    updateVoiceStore({ sessionStatus: "researching" });
    const state = getLayoutState();
    expect(state.phase).toBe("research");
    expect(state.dimensions).toEqual(phaseDimensions.research);
    expect(state.isTransitioning).toBe(false);
  });

  it("停止後にidleへ戻ると移行フラグが解除されデフォルトサイズとなる", () => {
    updateVoiceStore({ listeningStatus: "starting" });
    updateVoiceStore({ listeningStatus: "idle" });
    const state = getLayoutState();
    expect(state.phase).toBe("idle");
    expect(state.dimensions).toEqual(phaseDimensions.idle);
    expect(state.isTransitioning).toBe(false);
  });

  it("フェーズオーバーライドを設定するとresearchが維持される", () => {
    const layoutStore = useAppWindowLayoutStore.getState();
    layoutStore.setPhaseOverride("research");

    const initial = getLayoutState();
    expect(initial.phase).toBe("research");
    expect(initial.dimensions).toEqual(phaseDimensions.research);
    expect(initial.isTransitioning).toBe(false);

    updateVoiceStore({ listeningStatus: "starting" });
    updateVoiceStore({ sessionStatus: "optimizing" });

    const afterUpdates = getLayoutState();
    expect(afterUpdates.phase).toBe("research");
    expect(afterUpdates.dimensions).toEqual(phaseDimensions.research);
    expect(afterUpdates.isTransitioning).toBe(false);
  });

  it("オーバーライド解除で音声認識状態に合わせてフェーズが復帰する", () => {
    const layoutStore = useAppWindowLayoutStore.getState();
    layoutStore.setPhaseOverride("research");
    updateVoiceStore({ sessionStatus: "optimizing" });

    layoutStore.setPhaseOverride(null);

    const state = getLayoutState();
    expect(state.phase).toBe("optimizing");
    expect(state.dimensions).toEqual(phaseDimensions.optimizing);
    expect(state.isTransitioning).toBe(false);
  });
});
