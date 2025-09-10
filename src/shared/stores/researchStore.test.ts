import { describe, it, expect, beforeEach } from "vitest";
import { useResearchStore } from "./researchStore";

describe("researchStore", () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useResearchStore.getState().reset();
  });

  it("初期状態が正しく設定される", () => {
    const state = useResearchStore.getState();

    expect(state.selectedText).toBe("");
    expect(state.voiceCommand).toBe("");
    expect(state.isListening).toBe(false);
    expect(state.currentResearchId).toBe(null);
  });

  it("setSelectedTextが正しく動作する", () => {
    const { setSelectedText } = useResearchStore.getState();

    setSelectedText("テストテキスト");

    expect(useResearchStore.getState().selectedText).toBe("テストテキスト");
  });

  it("setVoiceCommandが正しく動作する", () => {
    const { setVoiceCommand } = useResearchStore.getState();

    setVoiceCommand("もっと詳しく");

    expect(useResearchStore.getState().voiceCommand).toBe("もっと詳しく");
  });

  it("setIsListeningが正しく動作する", () => {
    const { setIsListening } = useResearchStore.getState();

    setIsListening(true);

    expect(useResearchStore.getState().isListening).toBe(true);
  });

  it("setCurrentResearchIdが正しく動作する", () => {
    const { setCurrentResearchId } = useResearchStore.getState();

    setCurrentResearchId("research-123");

    expect(useResearchStore.getState().currentResearchId).toBe("research-123");
  });

  it("resetが正しく動作する", () => {
    const {
      setSelectedText,
      setVoiceCommand,
      setIsListening,
      setCurrentResearchId,
      reset,
    } = useResearchStore.getState();

    // 状態を変更
    setSelectedText("テキスト");
    setVoiceCommand("コマンド");
    setIsListening(true);
    setCurrentResearchId("id-123");

    // リセット実行
    reset();

    // 初期状態に戻ることを確認
    const state = useResearchStore.getState();
    expect(state.selectedText).toBe("");
    expect(state.voiceCommand).toBe("");
    expect(state.isListening).toBe(false);
    expect(state.currentResearchId).toBe(null);
  });

  it("partialTranscriptを設定/クリアできる", () => {
    const { setPartialTranscript, clearPartialTranscript } =
      useResearchStore.getState() as any;

    // 追加したAPIが存在すること
    expect(typeof setPartialTranscript).toBe("function");
    expect(typeof clearPartialTranscript).toBe("function");

    setPartialTranscript("これは途中の結果です");
    expect((useResearchStore.getState() as any).partialTranscript).toBe(
      "これは途中の結果です",
    );

    clearPartialTranscript();
    expect((useResearchStore.getState() as any).partialTranscript).toBe("");
  });
});
