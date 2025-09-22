import {
  useCallback,
  useMemo,
  useEffect,
  useState,
  useRef,
  startTransition,
} from "react";
import { useResearchStore } from "@/shared/stores/researchStore";
import {
  ListeningLifecycleStatus,
  useVoiceRecognitionStore,
} from "@/shared/stores/voiceRecognitionStore";
import { createProcessVoiceCommandUseCase } from "@/shared/useCases/ProcessVoiceCommandUseCase/factory";
import type { VoiceButtonState } from "../../types";
import { voicePerf } from "@/shared/lib/voicePerf";

const DEFAULT_DEVICE = "web";
const FALLBACK_LOCALE = "ja-JP";

const isTransitioning = (status: ListeningLifecycleStatus) =>
  status === "starting" || status === "stopping";

function getPreferredLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return FALLBACK_LOCALE;
}

function generateSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateHistoryId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `voice-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useVoiceRecognitionButtonViewModel() {
  const {
    setIsListening: setResearchListening,
    setVoiceCommand,
    setVoiceTranscript,
    setPartialTranscript,
    clearPartialTranscript,
    recordVoiceCommandResult,
  } = useResearchStore();

  const listeningStatus = useVoiceRecognitionStore(
    (state) => state.listeningStatus,
  );
  const markListening = useVoiceRecognitionStore(
    (state) => state.startListening,
  );
  const markNotListening = useVoiceRecognitionStore(
    (state) => state.stopListening,
  );
  const setListeningStatus = useVoiceRecognitionStore(
    (state) => state.setListeningStatus,
  );
  const setVoiceSessionId = useVoiceRecognitionStore(
    (state) => state.setSessionId,
  );

  const sessionIdRef = useRef<string | null>(
    useVoiceRecognitionStore.getState().sessionId,
  );
  const chunkSeqRef = useRef(0);

  useEffect(() => {
    const unsubscribe = useVoiceRecognitionStore.subscribe((state, prev) => {
      if (state.sessionId !== prev.sessionId) {
        sessionIdRef.current = state.sessionId;
        chunkSeqRef.current = 0;
      }
    });
    return unsubscribe;
  }, []);

  const [isMounted, setIsMounted] = useState(false);

  const voiceUseCase = useMemo(() => createProcessVoiceCommandUseCase(), []);

  const autoStop =
    (process.env.NEXT_PUBLIC_VOICE_AUTO_STOP || "").toLowerCase() === "1" ||
    (process.env.NEXT_PUBLIC_VOICE_AUTO_STOP || "").toLowerCase() === "true";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isSupported = useMemo(() => {
    if (!isMounted) return false;
    return voiceUseCase.checkSupport();
  }, [voiceUseCase, isMounted]);

  const hasPermission = true; // TODO: マイク権限チェックを実装

  const ensureSessionId = useCallback(() => {
    let current = sessionIdRef.current;
    if (!current) {
      current = generateSessionId();
      sessionIdRef.current = current;
      setVoiceSessionId(current);
    }
    return current;
  }, [setVoiceSessionId]);

  const waitForSseConnection = useCallback(async () => {
    if (useVoiceRecognitionStore.getState().isSseConnected) return;

    await new Promise<void>((resolve) => {
      let unsubscribe: (() => void) | null = null;
      const timeout = setTimeout(() => {
        unsubscribe?.();
        resolve();
      }, 1000);

      unsubscribe = useVoiceRecognitionStore.subscribe((state) => {
        if (state.isSseConnected) {
          clearTimeout(timeout);
          unsubscribe?.();
          resolve();
        }
      });
    });
  }, []);

  const sendVoiceEvent = useCallback(
    async ({
      transcript,
      confidence,
      pattern,
    }: {
      transcript: string;
      confidence: number;
      pattern?: string | null;
    }) => {
      const sessionId = ensureSessionId();
      const payload = {
        sessionId,
        transcript,
        confidence,
        isFinal: true,
        pattern: pattern ?? undefined,
        locale: getPreferredLocale(),
        device: DEFAULT_DEVICE,
        chunkSeq: ++chunkSeqRef.current,
        timestamp: new Date().toISOString(),
      };

      try {
        await waitForSseConnection();

        await fetch("/api/voice-events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("Failed to enqueue voice event:", error);
      }
    },
    [ensureSessionId, waitForSseConnection],
  );

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

  const buttonState: VoiceButtonState = useMemo(() => {
    const disabled =
      !isSupported || !hasPermission || isTransitioning(listeningStatus);
    const showActive = listeningStatus === "active";
    const text = (() => {
      switch (listeningStatus) {
        case "starting":
          return "接続中...";
        case "stopping":
          return "停止中...";
        case "active":
          return "停止";
        default:
          return "音声認識開始";
      }
    })();
    return {
      text,
      className: `px-4 py-2 rounded-md font-medium transition-colors ${
        disabled
          ? "bg-gray-400 text-gray-600 cursor-not-allowed"
          : showActive
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-green-600 hover:bg-green-700 text-white"
      }`,
      isDisabled: disabled,
      showIcon: !showActive,
    };
  }, [hasPermission, isSupported, listeningStatus]);

  const handleToggleListening = useCallback(async () => {
    voicePerf.mark("ui.toggle.start");

    const status = listeningStatus;
    if (isTransitioning(status)) {
      return;
    }

    if (status === "active") {
      try {
        setListeningStatus("stopping");
        await voiceUseCase.stopProcessing();
        console.log("🎙️ 音声認識停止");
      } catch (error) {
        console.error("Failed to stop voice recognition:", error);
      } finally {
        setListeningStatus("idle");
        markNotListening();
        setResearchListening(false);
        clearPartialTranscript();
      }
      return;
    }

    try {
      setListeningStatus("starting");
      console.log("🎙️ 音声認識開始...");
      chunkSeqRef.current = 0;
      ensureSessionId();

      voiceUseCase.setRealTimeEventHandlers({
        onTranscriptionResult: (text: string, isFinal: boolean) => {
          voicePerf.mark(isFinal ? "ui.result.final" : "ui.result.partial");
          console.log("🎯 音声認識結果:", text, "Final:", isFinal);

          if (isFinal) {
            startTransition(() => {
              setVoiceCommand(text);
              setVoiceTranscript(text);
              clearPartialTranscript();
            });
            voicePerf.mark("ui.state.updated");

            const dispatchEvent = (pattern?: string | null, confidence = 0) => {
              void sendVoiceEvent({
                transcript: text,
                confidence,
                pattern: pattern ?? null,
              });
            };

            defer(() => {
              try {
                const parsedResult = voiceUseCase.analyzeTranscript(text);
                dispatchEvent(
                  parsedResult.pattern,
                  parsedResult.confidence ?? 0,
                );

                recordVoiceCommandResult({
                  id: generateHistoryId(),
                  originalText: text,
                  recognizedPattern: parsedResult.pattern ?? undefined,
                  confidence: parsedResult.confidence ?? 0,
                  timestamp: new Date(),
                  displayText: text,
                });

                if (
                  parsedResult.pattern &&
                  parsedResult.confidence > 0.5 &&
                  autoStop
                ) {
                  voicePerf.mark("ui.autostop.trigger");
                  markNotListening();
                  setListeningStatus("idle");
                  setResearchListening(false);
                  if (voiceUseCase.isProcessing) {
                    voiceUseCase
                      .stopProcessing()
                      .catch((err) =>
                        console.error("Failed to stop after recognition:", err),
                      );
                  }
                }
              } catch (error) {
                console.warn("Voice command parsing failed", error);
                dispatchEvent(null, 0);
                recordVoiceCommandResult({
                  id: generateHistoryId(),
                  originalText: text,
                  recognizedPattern: undefined,
                  confidence: 0,
                  timestamp: new Date(),
                  displayText: text,
                });
              }
            });
          } else {
            console.log("📝 途中結果:", text);
            setPartialTranscript(text);
          }
        },
        onError: (error) => {
          voicePerf.mark("ui.error");
          console.error("AWS Transcribe Error:", error);
          const isSilenceTimeout =
            error.error === "network" &&
            typeof error.message === "string" &&
            error.message.toLowerCase().includes("no audio activity");

          if (
            isSilenceTimeout &&
            useVoiceRecognitionStore.getState().isListening
          ) {
            voiceUseCase
              .stopProcessing()
              .catch(() => void 0)
              .then(() => voiceUseCase.startRealTimeTranscription())
              .catch((err) => {
                console.error("Auto-reconnect failed:", err);
                setListeningStatus("idle");
                markNotListening();
                setResearchListening(false);
              });
          } else {
            setListeningStatus("idle");
            markNotListening();
            setResearchListening(false);
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
          voicePerf.mark(`ui.connection.${status}`);
          console.log("🔗 接続状態変更:", status);
        },
      });

      voicePerf.mark("ui.stt.start.call");
      await voiceUseCase.startRealTimeTranscription();
      setListeningStatus("active");
      markListening();
      setResearchListening(true);
    } catch (error) {
      voicePerf.mark("ui.stt.start.error");
      console.error("Failed to start voice recognition:", error);
      setListeningStatus("idle");
      markNotListening();
      setResearchListening(false);
      clearPartialTranscript();
      try {
        await voiceUseCase.stopProcessing();
      } catch (stopError) {
        console.error("Failed to cleanup after start error:", stopError);
      }
    }
  }, [
    listeningStatus,
    voiceUseCase,
    markListening,
    markNotListening,
    setVoiceCommand,
    setVoiceTranscript,
    setResearchListening,
    autoStop,
    clearPartialTranscript,
    defer,
    setPartialTranscript,
    ensureSessionId,
    sendVoiceEvent,
    recordVoiceCommandResult,
    setListeningStatus,
  ]);

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
