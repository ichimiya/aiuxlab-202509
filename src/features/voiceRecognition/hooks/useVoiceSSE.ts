import { useEffect, useRef } from "react";
import {
  useVoiceRecognitionStore,
  type VoiceSessionState,
  type PendingIntent,
} from "@/shared/stores/voiceRecognitionStore";

interface UseVoiceSSEOptions {
  sessionId: string | null;
  isPrimaryTab: boolean;
}

const BASE_URL = "/api/voice-events/stream";

function parseMessage<T>(event: MessageEvent<string>): T | null {
  try {
    return JSON.parse(event.data) as T;
  } catch (error) {
    console.warn("Failed to parse SSE payload", error);
    return null;
  }
}

export function useVoiceSSE({ sessionId, isPrimaryTab }: UseVoiceSSEOptions) {
  const setSessionId = useVoiceRecognitionStore((state) => state.setSessionId);
  const applySessionUpdate = useVoiceRecognitionStore(
    (state) => state.applySessionUpdate,
  );
  const setPendingIntent = useVoiceRecognitionStore(
    (state) => state.setPendingIntent,
  );
  const setError = useVoiceRecognitionStore((state) => state.setError);
  const clearError = useVoiceRecognitionStore((state) => state.clearError);
  const setSseConnected = useVoiceRecognitionStore(
    (state) => state.setSseConnected,
  );
  const incrementReconnectAttempt = useVoiceRecognitionStore(
    (state) => state.incrementReconnectAttempt,
  );
  const resetReconnectAttempt = useVoiceRecognitionStore(
    (state) => state.resetReconnectAttempt,
  );

  const reconnectAttemptRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    latestSessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !isPrimaryTab) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (!isPrimaryTab) {
        setSseConnected(false);
      }
      return;
    }

    setSessionId(sessionId);
    openStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isPrimaryTab]);

  const scheduleReconnect = () => {
    incrementReconnectAttempt();
    reconnectAttemptRef.current =
      useVoiceRecognitionStore.getState().reconnectAttempt;
    const attempt = reconnectAttemptRef.current;
    const delaySeconds = Math.min(2 ** Math.max(attempt - 1, 0), 16);

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = setTimeout(() => {
      if (!latestSessionIdRef.current || !isPrimaryTab) {
        return;
      }
      openStream();
    }, delaySeconds * 1000);
  };

  const handleError = (message?: string) => {
    setSseConnected(false);
    setError(message ?? "SSE connection error");
    scheduleReconnect();
  };

  const openStream = () => {
    if (!latestSessionIdRef.current) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = `${BASE_URL}?sessionId=${encodeURIComponent(latestSessionIdRef.current)}`;
    const es = new EventSource(url, {
      withCredentials: true,
    } as EventSourceInit);
    eventSourceRef.current = es;
    setSseConnected(false);

    const onOpen = () => {
      clearError();
      setSseConnected(true);
      resetReconnectAttempt();
      reconnectAttemptRef.current = 0;
    };

    const onSessionUpdate = (event: MessageEvent<string>) => {
      const payload = parseMessage<VoiceSessionState>(event);
      if (payload) {
        applySessionUpdate(payload);
        clearError();
      }
    };

    const onIntentConfirmation = (event: MessageEvent<string>) => {
      const payload = parseMessage<PendingIntent>(event);
      if (payload) {
        setPendingIntent(payload);
      }
    };

    const onErrorEvent = (event: MessageEvent<string>) => {
      const payload = parseMessage<{ message?: string }>(event);
      handleError(payload?.message);
    };

    es.addEventListener("open", onOpen);
    es.addEventListener("session_update", onSessionUpdate);
    es.addEventListener("intent_confirmation", onIntentConfirmation);
    es.addEventListener("error", onErrorEvent);
    es.onerror = () => handleError();
  };

  return {
    reconnectAttempt: useVoiceRecognitionStore(
      (state) => state.reconnectAttempt,
    ),
  };
}
