export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface ConsoleLoggerOptions {
  minLevel?: LogLevel;
  stream?: Pick<Console, "log" | "warn" | "error">;
}

export function createConsoleLogger(options: ConsoleLoggerOptions = {}): Logger {
  const minRank = LEVEL_RANK[options.minLevel ?? "info"];
  const out = options.stream ?? console;

  function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < minRank) return;
    const payload = {
      level,
      time: new Date().toISOString(),
      message,
      ...(meta ?? {}),
    };
    const line = JSON.stringify(payload);
    if (level === "error") out.error(line);
    else if (level === "warn") out.warn(line);
    else out.log(line);
  }

  return {
    debug: (m, meta) => emit("debug", m, meta),
    info: (m, meta) => emit("info", m, meta),
    warn: (m, meta) => emit("warn", m, meta),
    error: (m, meta) => emit("error", m, meta),
  };
}

export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
