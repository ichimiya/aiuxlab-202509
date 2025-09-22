"use client";

import { QueryOptimizer } from "@/features/queryOptimization/components/QueryOptimizer";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";

export default function Home() {
  const listeningStatus = useVoiceRecognitionStore(
    (state) => state.listeningStatus,
  );
  const sessionStatus = useVoiceRecognitionStore(
    (state) => state.sessionState?.status,
  );

  const shouldShowContent = listeningStatus !== "idle" || !!sessionStatus;

  if (!shouldShowContent) {
    return null;
  }

  return (
    <main className="w-full max-w-4xl">
      <QueryOptimizer />
    </main>
  );
}
