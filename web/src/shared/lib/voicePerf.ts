/*
 * Lightweight perf logger for voice recognition flow.
 * Enable via: NEXT_PUBLIC_VOICE_PERF=1|true|on
 */

type Data = Record<string, unknown> | undefined;

function enabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_VOICE_PERF || "").toString().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

const origin = (() => {
  // Capture first read as origin
  const n =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  return n;
})();

function nowMs(): number {
  const n =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  return n - origin;
}

function fmt(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

export const voicePerf = {
  enabled,
  nowMs,
  mark(name: string, data?: Data) {
    if (!enabled()) return;
    if (data !== undefined)
      console.log(`[VOICE_PERF] ${name} t=${fmt(nowMs())}`, data);
    else console.log(`[VOICE_PERF] ${name} t=${fmt(nowMs())}`);
  },
  span(name: string) {
    const start = nowMs();
    // mark start as well for consistent timeline
    this.mark(`${name}.start`);
    return (data?: Data) => {
      const dur = nowMs() - start;
      this.mark(`${name}.end`, {
        ...(data || {}),
        durationMs: Math.round(dur * 10) / 10,
      });
    };
  },
};

export type VoicePerf = typeof voicePerf;
