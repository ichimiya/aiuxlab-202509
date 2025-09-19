"use client";

import { useVoiceLevelMeterViewModel } from "./useVoiceLevelMeterViewModel";

export function VoiceLevelMeter() {
  const viewModel = useVoiceLevelMeterViewModel();

  if (!viewModel.displayState.isVisible) return null;

  return (
    <div className="flex items-center space-x-3">
      {/* マイクアイコン */}
      <svg
        className="w-4 h-4 text-gray-600 dark:text-gray-400"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
          clipRule="evenodd"
        />
      </svg>

      {/* レベルメーター */}
      <div className="flex-1 max-w-24">
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={viewModel.displayState.levelBarClassName}
            style={{ width: `${viewModel.displayState.volumePercentage}%` }}
          />
        </div>
      </div>

      {/* 音量テキスト */}
      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-8">
        {viewModel.displayState.volumeText}
      </span>
    </div>
  );
}
