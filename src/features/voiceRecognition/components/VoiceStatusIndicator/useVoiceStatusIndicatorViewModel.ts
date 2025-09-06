import { useMemo } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import type { VoiceRecognitionStatus } from "../../types";

interface StatusConfig {
  text: string;
  color: string;
  showPulse: boolean;
}

export function useVoiceStatusIndicatorViewModel() {
  const { isListening } = useResearchStore();

  // 現在の状態を計算
  const currentStatus: VoiceRecognitionStatus = useMemo(() => {
    if (isListening) return "listening";
    return "idle";
  }, [isListening]);

  // 状態設定
  const statusConfig: Record<VoiceRecognitionStatus, StatusConfig> = {
    idle: {
      text: "待機中",
      color: "gray",
      showPulse: false,
    },
    initializing: {
      text: "初期化中...",
      color: "blue",
      showPulse: true,
    },
    listening: {
      text: "音声認識中...",
      color: "green",
      showPulse: true,
    },
    processing: {
      text: "処理中...",
      color: "blue",
      showPulse: true,
    },
    error: {
      text: "エラー",
      color: "red",
      showPulse: false,
    },
  };

  const config = statusConfig[currentStatus];

  // UI表示用の状態
  const displayState = useMemo(
    () => ({
      statusText: config.text,
      containerClassName: `flex items-center space-x-2 p-3 rounded-lg bg-${config.color}-50 dark:bg-${config.color}-900/20 border border-${config.color}-200 dark:border-${config.color}-800`,
      indicatorClassName: `w-3 h-3 rounded-full bg-${config.color}-500 ${
        config.showPulse ? "animate-pulse" : ""
      }`,
      textClassName: `text-sm font-medium text-${config.color}-700 dark:text-${config.color}-300`,
      isVisible: true, // 常に表示
    }),
    [config],
  );

  return {
    currentStatus,
    displayState,
  };
}
