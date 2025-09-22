"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { OptimizationSuggestions } from "./OptimizationSuggestions";
import { useVoiceSSE } from "@/features/voiceRecognition/hooks/useVoiceSSE";
import { useVoiceRecognitionStore } from "@/shared/stores/voiceRecognitionStore";
import { useResearchStore } from "@/shared/stores/researchStore";
import { useRouter } from "next/navigation";

export function QueryOptimizer() {
  const sessionId = useVoiceRecognitionStore((state) => state.sessionId);
  const sessionState = useVoiceRecognitionStore((state) => state.sessionState);

  const candidateSnapshots = useMemo(
    () => sessionState?.candidates ?? [],
    [sessionState?.candidates],
  );
  const candidates = useMemo(
    () =>
      candidateSnapshots.map((snapshot) => {
        const { rank, source, ...rest } = snapshot;
        void rank;
        void source;
        return rest;
      }),
    [candidateSnapshots],
  );
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(
    null,
  );
  const [isStartingResearch, setIsStartingResearch] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidates.length) {
      setHoveredCandidateId(null);
      return;
    }

    setHoveredCandidateId((current) => {
      if (!current) return null;
      return candidates.some((candidate) => candidate.id === current)
        ? current
        : null;
    });
  }, [candidates]);

  useVoiceSSE({ sessionId, isPrimaryTab: true });

  const selectedText = useResearchStore((state) => state.selectedText);
  const voiceCommand = useResearchStore((state) => state.voiceCommand);
  const voiceTranscript = useResearchStore((state) => state.voiceTranscript);
  const setCurrentResearchId = useResearchStore(
    (state) => state.setCurrentResearchId,
  );
  const router = useRouter();

  const startResearch = useCallback(
    async (candidate: (typeof candidates)[number]) => {
      if (!candidate?.query || isStartingResearch) return;

      setIsStartingResearch(true);
      setStartError(null);

      const requestBody: Record<string, string> = {
        query: candidate.query,
      };

      if (selectedText?.trim()) {
        requestBody.selectedText = selectedText;
      }

      if (voiceCommand?.trim()) {
        requestBody.voiceCommand = voiceCommand;
      }

      const transcriptValue = voiceTranscript?.trim()
        ? voiceTranscript
        : (sessionState?.latestTranscript ?? "");
      if (transcriptValue) {
        requestBody.voiceTranscript = transcriptValue;
      }

      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as { id: string };
        setCurrentResearchId(payload.id);
        router.push(`/research/${payload.id}`);
      } catch (error) {
        console.error("Failed to start research", error);
        setStartError("リサーチ開始に失敗しました");
      } finally {
        setIsStartingResearch(false);
      }
    },
    [
      candidates,
      isStartingResearch,
      selectedText,
      voiceCommand,
      voiceTranscript,
      sessionState?.latestTranscript,
      setCurrentResearchId,
      router,
    ],
  );

  return (
    <div className="space-y-4">
      {candidates.length > 0 && (
        <OptimizationSuggestions
          candidates={candidates}
          selectedCandidateId={hoveredCandidateId ?? undefined}
          onSelect={setHoveredCandidateId}
          onStartResearch={startResearch}
        />
      )}
      {startError && <p className="text-sm text-red-400">{startError}</p>}
    </div>
  );
}
