import { useCallback, useMemo, useEffect, useState } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import { createProcessVoiceCommandUseCase } from "@/shared/useCases/ProcessVoiceCommandUseCase/factory";
import type { VoiceButtonState } from "../../types";

export function useVoiceRecognitionButtonViewModel() {
  const { isListening, setIsListening, setVoiceCommand } = useResearchStore();

  // ハイドレーション対応の状態管理
  const [isMounted, setIsMounted] = useState(false);

  // UseCase インスタンス作成
  const voiceUseCase = useMemo(() => {
    return createProcessVoiceCommandUseCase();
  }, []);

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
                // VoiceDomainServiceでパターン解析
                const domainService = voiceUseCase["voiceDomainService"];
                if (domainService) {
                  const parsedResult = domainService.parseVoiceCommand(text);

                  if (parsedResult.pattern && parsedResult.confidence > 0.5) {
                    console.log(
                      "✅ 音声コマンド認識成功:",
                      text,
                      "パターン:",
                      parsedResult.pattern,
                    );
                    setVoiceCommand(text);

                    // 認識成功したら自動的に停止
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
              } else {
                console.log("📝 途中結果:", text);
              }
            },
            onError: (error) => {
              console.error("AWS Transcribe Error:", error);
              setIsListening(false);

              // ユーザーに分かりやすいエラーメッセージを表示
              if (error.error === "transcription-failed") {
                console.warn("🚨 音声認識エラー:", error.message);
              } else if (error.error === "not-allowed") {
                console.warn("🚨 マイク権限エラー:", error.message);
              } else {
                console.warn("🚨 音声認識サービスエラー:", error.message);
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
        });
      } catch (error) {
        console.error("Failed to start voice recognition:", error);
        setIsListening(false);
      }
    }
  }, [isListening, voiceUseCase, setIsListening, setVoiceCommand]);

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
