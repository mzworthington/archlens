import type { LoggerPort } from '@archlens/analysis/ports';

/** Thin logger that forwards analysis messages to the canvas logger port. */
export function createAnalysisLogger(logger: {
  info: (m: string, meta?: Record<string, unknown>) => void;
  warn: (m: string, meta?: Record<string, unknown>) => void;
  error: (m: string, err?: unknown) => void;
}): LoggerPort {
  return {
    info: (message, context) => logger.info(message, context),
    warn: (message, context) => logger.warn(message, context),
    error: (message, error, context) => logger.error(message, error ?? context),
  };
}
