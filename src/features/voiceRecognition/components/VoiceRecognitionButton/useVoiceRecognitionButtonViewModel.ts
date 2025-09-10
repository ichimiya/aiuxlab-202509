import {
  useCallback,
  useMemo,
  useEffect,
  useState,
  startTransition,
} from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import { createProcessVoiceCommandUseCase } from "@/shared/useCases/ProcessVoiceCommandUseCase/factory";
import type { VoiceButtonState } from "../../types";

export function useVoiceRecognitionButtonViewModel() {
  const {
    isListening,
    setIsListening,
    setVoiceCommand,
    setPartialTranscript,
    clearPartialTranscript,
  } = useResearchStore();

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
    if (isListening) {
      try {
        if (!voiceUseCase.isProcessing) {
          setIsListening(false);
          return;
        }
        await voiceUseCase.stopProcessing();
        setIsListening(false);
        console.log("🎙️ 音声認識停止");
      } catch (error) {
        console.error("Failed to stop voice recognition:", error);
      }
    } else {
      try {
        console.log("🎙️ 音声認識開始...");
        setIsListening(true);

        // AWS Transcribe イベントハンドラーを設定
        const transcribeClient = voiceUseCase["transcribeClient"]; // プライベートプロパティにアクセス（テスト用）
        if (
          transcribeClient &&
          typeof transcribeClient.setEventHandlers === "function"
        ) {
          transcribeClient.setEventHandlers({
            onTranscriptionResult: (text: string, isFinal: boolean) => {
              console.log("🎯 音声認識結果:", text, "Final:", isFinal);

              if (isFinal) {
                // 最終結果は即時にUIへ反映（同期コスト最小化）
                startTransition(() => {
                  setVoiceCommand(text);
                  clearPartialTranscript();
                });

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
                      setIsListening(false);
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
                    setIsListening(false);
                  });
              } else {
                setIsListening(false);
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
              console.log("🔗 接続状態変更:", status);
            },
          });
        }

        // 音声認識を開始（UIをブロックしない）
        voiceUseCase.startRealTimeTranscription().catch((err) => {
          console.error("Failed to start voice recognition:", err);
          setIsListening(false);
          clearPartialTranscript();
        });
      } catch (error) {
        console.error("Failed to start voice recognition:", error);
        setIsListening(false);
        clearPartialTranscript();
      }
    }
  }, [
    isListening,
    voiceUseCase,
    setIsListening,
    setVoiceCommand,
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
