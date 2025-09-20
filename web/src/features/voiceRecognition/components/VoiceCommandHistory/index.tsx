"use client";

import { useVoiceCommandHistoryViewModel } from "./useVoiceCommandHistoryViewModel";

export function VoiceCommandHistory() {
  const viewModel = useVoiceCommandHistoryViewModel();

  if (!viewModel.hasCommands) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        音声コマンド履歴
      </h3>
      <div className="max-h-40 overflow-y-auto space-y-2">
        {viewModel.displayCommands.map((command) => (
          <div
            key={command.id}
            className={viewModel.getCommandClassName(command)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {command.displayText}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {command.formattedTime}
                  </span>
                  {command.recognizedPattern && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                      {command.recognizedPattern}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(command.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
