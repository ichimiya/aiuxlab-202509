import { useMemo } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import type { VoiceCommandUI } from "../../types";

export function useVoiceCommandHistoryViewModel() {
  const { voiceCommand } = useResearchStore();
  const maxCommands = 5;

  // モック履歴データ（実際の実装では専用ストアから取得）
  const mockCommands: VoiceCommandUI[] = useMemo(() => {
    if (!voiceCommand) return [];

    return [
      {
        id: "1",
        timestamp: new Date(),
        originalText: voiceCommand,
        recognizedPattern: "deepdive",
        confidence: 0.95,
        formattedTime: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        displayText: voiceCommand,
      },
    ];
  }, [voiceCommand]);

  const displayCommands = useMemo(
    () => mockCommands.slice(-maxCommands).reverse(), // 新しいものを上に表示
    [mockCommands, maxCommands],
  );

  const getCommandClassName = (command: VoiceCommandUI) => {
    const baseClass = "p-3 rounded-lg border text-sm";
    const confidenceClass =
      command.confidence > 0.8
        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
        : command.confidence > 0.5
          ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";

    return `${baseClass} ${confidenceClass}`;
  };

  return {
    hasCommands: displayCommands.length > 0,
    displayCommands,
    getCommandClassName,
  };
}
