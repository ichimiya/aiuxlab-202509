"use client";

import { useVoiceStatusIndicatorViewModel } from "./useVoiceStatusIndicatorViewModel";

export function VoiceStatusIndicator() {
  const viewModel = useVoiceStatusIndicatorViewModel();

  if (!viewModel.displayState.isVisible) return null;

  return (
    <div className={viewModel.displayState.containerClassName}>
      <div className={viewModel.displayState.indicatorClassName} />
      <span className={viewModel.displayState.textClassName}>
        {viewModel.displayState.statusText}
      </span>
    </div>
  );
}
