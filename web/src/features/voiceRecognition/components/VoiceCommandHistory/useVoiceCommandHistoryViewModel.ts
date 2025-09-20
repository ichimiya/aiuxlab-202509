import { useMemo } from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import type { VoiceCommandUI } from "../../types";

function formatTimestamp(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useVoiceCommandHistoryViewModel() {
  const voiceCommandHistory = useResearchStore(
    (state) => state.voiceCommandHistory,
  );
  const maxCommands = 5;

  const displayCommands: VoiceCommandUI[] = useMemo(() => {
    return voiceCommandHistory.slice(0, maxCommands).map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      originalText: entry.originalText,
      recognizedPattern: entry.recognizedPattern,
      confidence: entry.confidence,
      formattedTime: formatTimestamp(entry.timestamp),
      displayText: entry.displayText ?? entry.originalText,
    }));
  }, [voiceCommandHistory, maxCommands]);

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
