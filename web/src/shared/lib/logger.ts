type Level = "silent" | "error" | "warn" | "info" | "debug";

const order: Record<Level, number> = {
  silent: -1,
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function resolveLevel(): Level {
  const raw = (
    process.env.NEXT_PUBLIC_LOG_LEVEL ||
    process.env.LOG_LEVEL ||
    ""
  ).toLowerCase();
  if (
    raw === "silent" ||
    raw === "error" ||
    raw === "warn" ||
    raw === "info" ||
    raw === "debug"
  ) {
    return raw;
  }
  // Default: suppress debug in production, allow info
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(target: Level, current: Level): boolean {
  return order[current] >= order[target];
}

export const logger = {
  debug: (...args: unknown[]) => {
    const lvl = resolveLevel();
    if (shouldLog("debug", lvl)) {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]) => {
    const lvl = resolveLevel();
    if (shouldLog("info", lvl)) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    const lvl = resolveLevel();
    if (shouldLog("warn", lvl)) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // errorは常に出力（silent設定のみ抑制）
    const lvl = resolveLevel();
    if (shouldLog("error", lvl)) {
      console.error(...args);
    }
  },
};
