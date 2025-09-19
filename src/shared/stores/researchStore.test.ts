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
    expect((state as any).voiceTranscript).toBe("");
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

  it("setVoiceTranscriptが正しく動作する", () => {
    const { setVoiceTranscript } = useResearchStore.getState() as any;

    expect(typeof setVoiceTranscript).toBe("function");

    setVoiceTranscript("AIって危険？詳しく");

    expect((useResearchStore.getState() as any).voiceTranscript).toBe(
      "AIって危険？詳しく",
    );
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
      setVoiceTranscript,
      setCurrentResearchId,
      reset,
    } = useResearchStore.getState();

    // 状態を変更
    setSelectedText("テキスト");
    setVoiceCommand("コマンド");
    setIsListening(true);
    setVoiceTranscript("AIって危険？");
    setCurrentResearchId("id-123");

    // リセット実行
    reset();

    // 初期状態に戻ることを確認
    const state = useResearchStore.getState();
    expect(state.selectedText).toBe("");
    expect(state.voiceCommand).toBe("");
    expect((state as any).voiceTranscript).toBe("");
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

  it("音声解析結果を記録し履歴を保持できる", () => {
    const { recordVoiceCommandResult, getVoiceCommandHistory } =
      useResearchStore.getState() as any;

    expect(typeof recordVoiceCommandResult).toBe("function");
    expect(typeof getVoiceCommandHistory).toBe("function");

    const now = new Date("2025-09-17T10:00:00.000Z");

    recordVoiceCommandResult({
      id: "voice-1",
      originalText: "AIの倫理的リスクについて調べて",
      recognizedPattern: "deepdive",
      confidence: 0.82,
      timestamp: now,
      displayText: "AIの倫理的リスクについて調べて",
    });

    const state = useResearchStore.getState() as any;
    expect(state.recognizedPattern).toBe("deepdive");
    expect(state.intentConfidence).toBeCloseTo(0.82);

    const history = getVoiceCommandHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe("voice-1");
    expect(history[0]?.recognizedPattern).toBe("deepdive");
  });

  it("音声履歴は最大5件まで保持される", () => {
    const { recordVoiceCommandResult, getVoiceCommandHistory } =
      useResearchStore.getState() as any;

    for (let i = 0; i < 7; i += 1) {
      recordVoiceCommandResult({
        id: `voice-${i}`,
        originalText: `コマンド${i}`,
        recognizedPattern: "summary",
        confidence: 0.6 + i * 0.01,
        timestamp: new Date(2025, 8, 17, 10, 0, i),
        displayText: `コマンド${i}`,
      });
    }

    const history = getVoiceCommandHistory();
    expect(history).toHaveLength(5);
    expect(history[0]?.id).toBe("voice-6");
    expect(history[4]?.id).toBe("voice-2");
  });

  it("pendingIntentを設定およびクリアできる", () => {
    const { setPendingIntent, clearPendingIntent } =
      useResearchStore.getState() as any;

    expect(useResearchStore.getState()).toMatchObject({
      pendingIntent: null,
    });

    setPendingIntent({
      intentId: "START_RESEARCH",
      confidence: 0.71,
      parameters: { candidateId: "cand-1" },
      expiresAt: "2025-09-17T10:05:00.000Z",
    });

    expect((useResearchStore.getState() as any).pendingIntent).toMatchObject({
      intentId: "START_RESEARCH",
      confidence: 0.71,
    });

    clearPendingIntent();
    expect((useResearchStore.getState() as any).pendingIntent).toBeNull();
  });

  it("pendingIntentの信頼度で最新履歴を更新する", () => {
    const { recordVoiceCommandResult, setPendingIntent } =
      useResearchStore.getState() as any;

    recordVoiceCommandResult({
      id: "voice-50",
      originalText: "より詳しく教えて",
      recognizedPattern: "deepdive",
      confidence: 0.42,
      timestamp: new Date("2025-09-17T11:00:00.000Z"),
      displayText: "より詳しく教えて",
    });

    setPendingIntent({
      intentId: "START_RESEARCH",
      confidence: 0.74,
      parameters: {},
      expiresAt: "2025-09-17T11:00:30.000Z",
    });

    const state = useResearchStore.getState() as any;
    expect(state.voiceCommandHistory[0]?.confidence).toBeCloseTo(0.74);
    expect(state.intentConfidence).toBeCloseTo(0.74);
  });
});
