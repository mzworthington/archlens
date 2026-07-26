export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

export const noopLogger: LoggerPort = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
