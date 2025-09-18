import {
  useCallback,
  useMemo,
  useEffect,
  useState,
  startTransition,
} from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";
import { createProcessVoiceCommandUseCase } from "@/shared/useCases/ProcessVoiceCommandUseCase/factory";
import type { VoiceButtonState } from "../../types";
import { voicePerf } from "@/shared/lib/voicePerf";

export function useVoiceRecognitionButtonViewModel() {
  const {
    setIsListening: setResearchListening,
    setVoiceCommand,
    setVoiceTranscript,
    setPartialTranscript,
    clearPartialTranscript,
  } = useResearchStore();

  const isListening = useVoiceRecognitionStore((state) => state.isListening);
  const markListening = useVoiceRecognitionStore(
    (state) => state.startListening,
  );
  const markNotListening = useVoiceRecognitionStore(
    (state) => state.stopListening,
  );

  // ハイドレーション対応の状態管理
  const [isMounted, setIsMounted] = useState(false);

  // UseCase インスタンス作成
  const voiceUseCase = useMemo(() => {
    return createProcessVoiceCommandUseCase();
  }, []);

  // 自動停止を環境変数で制御（既定: false）
  const autoStop =
    (process.env.NEXT_PUBLIC_VOICE_AUTO_STOP || "").toLowerCase() === "1" ||
    (process.env.NEXT_PUBLIC_VOICE_AUTO_STOP || "").toLowerCase() === "true";

  // マウント後に状態を更新
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // サポート状況とエラー状態（ハイドレーション対応）
  const isSupported = useMemo(() => {
    // 初回レンダリング時はfalseで統一、マウント後にチェック
    if (!isMounted) return false;
    return voiceUseCase.checkSupport();
  }, [voiceUseCase, isMounted]);

  const hasPermission = true; // 実際の実装では権限チェック

  // ブラウザアイドル時/次ティックに処理を後回し
  const defer = useCallback((fn: () => void) => {
    type MaybeRIC = typeof globalThis & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout?: number },
      ) => number;
    };
    const ric = (globalThis as MaybeRIC).requestIdleCallback;
    if (typeof ric === "function") {
      ric(() => fn(), { timeout: 200 });
    } else {
      setTimeout(fn, 0);
    }
  }, []);

  // ボタン状態の計算
  const buttonState: VoiceButtonState = useMemo(() => {
    const isDisabled = !isSupported || !hasPermission;

    return {
      text: isListening ? "停止" : "音声認識開始",
      className: `px-4 py-2 rounded-md font-medium transition-colors ${
        isDisabled
          ? "bg-gray-400 text-gray-600 cursor-not-allowed"
          : isListening
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-green-600 hover:bg-green-700 text-white"
      }`,
      isDisabled,
      showIcon: !isListening,
    };
  }, [isListening, isSupported, hasPermission]);

  // 音声認識の開始/停止処理
  const handleToggleListening = useCallback(async () => {
    voicePerf.mark("ui.toggle.start");
    if (isListening) {
      try {
        if (!voiceUseCase.isProcessing) {
          markNotListening();
          setResearchListening(false);
          return;
        }
        await voiceUseCase.stopProcessing();
        markNotListening();
        setResearchListening(false);
        console.log("🎙️ 音声認識停止");
      } catch (error) {
        console.error("Failed to stop voice recognition:", error);
      }
    } else {
      try {
        console.log("🎙️ 音声認識開始...");
        markListening();
        setResearchListening(true);

        // AWS Transcribe イベントハンドラーを設定
        const transcribeClient = voiceUseCase["transcribeClient"]; // プライベートプロパティにアクセス（テスト用）
        if (
          transcribeClient &&
          typeof transcribeClient.setEventHandlers === "function"
        ) {
          transcribeClient.setEventHandlers({
            onTranscriptionResult: (text: string, isFinal: boolean) => {
              voicePerf.mark(isFinal ? "ui.result.final" : "ui.result.partial");
              console.log("🎯 音声認識結果:", text, "Final:", isFinal);

              if (isFinal) {
                // 最終結果は即時にUIへ反映（同期コスト最小化）
                startTransition(() => {
                  setVoiceCommand(text);
                  setVoiceTranscript(text);
                  clearPartialTranscript();
                });
                voicePerf.mark("ui.state.updated");

                // ドメイン解析はアイドル/次ティックへ後回し（メインスレッドを詰まらせない）
                defer(() => {
                  const domainService = voiceUseCase["voiceDomainService"];
                  if (!domainService) return;
                  const parsedResult = domainService.parseVoiceCommand(text);
                  if (parsedResult.pattern && parsedResult.confidence > 0.5) {
                    console.log(
                      "✅ 音声コマンド認識成功:",
                      text,
                      "パターン:",
                      parsedResult.pattern,
                    );
                    if (autoStop) {
                      voicePerf.mark("ui.autostop.trigger");
                      markNotListening();
                      setResearchListening(false);
                      if (voiceUseCase.isProcessing) {
                        voiceUseCase
                          .stopProcessing()
                          .catch((err) =>
                            console.error(
                              "Failed to stop after recognition:",
                              err,
                            ),
                          );
                      }
                    }
                  }
                });
              } else {
                console.log("📝 途中結果:", text);
                setPartialTranscript(text);
              }
            },
            onError: (error) => {
              voicePerf.mark("ui.error");
              console.error("AWS Transcribe Error:", error);
              const isSilenceTimeout =
                error.error === "network" &&
                typeof error.message === "string" &&
                error.message.toLowerCase().includes("no audio activity");

              if (isSilenceTimeout && isListening) {
                // 自動再接続（UIは継続状態のまま）
                voiceUseCase
                  .stopProcessing()
                  .catch(() => void 0)
                  .then(() => voiceUseCase.startRealTimeTranscription())
                  .catch((err) => {
                    console.error("Auto-reconnect failed:", err);
                    markNotListening();
                  });
              } else {
                markNotListening();
                setResearchListening(false);
                // ユーザーに分かりやすいエラーメッセージを表示
                if (error.error === "transcription-failed") {
                  console.warn("🚨 音声認識エラー:", error.message);
                } else if (error.error === "not-allowed") {
                  console.warn("🚨 マイク権限エラー:", error.message);
                } else {
                  console.warn("🚨 音声認識サービスエラー:", error.message);
                }
              }
            },
            onConnectionStatusChange: (status) => {
              voicePerf.mark(`ui.connection.${status}`);
              console.log("🔗 接続状態変更:", status);
            },
          });
        }

        // 音声認識を開始（UIをブロックしない）
        voicePerf.mark("ui.stt.start.call");
        voiceUseCase.startRealTimeTranscription().catch((err) => {
          console.error("Failed to start voice recognition:", err);
          markNotListening();
          setResearchListening(false);
          clearPartialTranscript();
        });
      } catch (error) {
        voicePerf.mark("ui.stt.start.error");
        console.error("Failed to start voice recognition:", error);
        markNotListening();
        setResearchListening(false);
        clearPartialTranscript();
      }
    }
  }, [
    isListening,
    voiceUseCase,
    markListening,
    markNotListening,
    setVoiceCommand,
    setVoiceTranscript,
    setResearchListening,
    autoStop,
    clearPartialTranscript,
    defer,
    setPartialTranscript,
  ]);

  // 権限要求
  const requestPermission = useCallback(async () => {
    try {
      return await voiceUseCase.requestPermission();
    } catch (error) {
      console.error("Failed to request microphone permission:", error);
      return false;
    }
  }, [voiceUseCase]);

  return {
    buttonState,
    isSupported,
    hasPermission,
    handleToggleListening,
    requestPermission,
  };
}
