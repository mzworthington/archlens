import type { LoggerPort } from '@archlens/analysis/ports';

/** Strip emoji / pictographs that the analyzer uses as progress chrome. */
export function sanitizeAnalysisMessage(message: string): string {
  return message
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Thin logger that forwards analysis messages to the canvas logger port. */
export function createAnalysisLogger(logger: {
  info: (m: string, meta?: Record<string, unknown>) => void;
  warn: (m: string, meta?: Record<string, unknown>) => void;
  error: (m: string, err?: unknown) => void;
}): LoggerPort {
  return {
    info: (message, context) => {
      const cleaned = sanitizeAnalysisMessage(message);
      if (!cleaned) return;
      logger.info(cleaned, context);
    },
    warn: (message, context) => {
      const cleaned = sanitizeAnalysisMessage(message);
      if (!cleaned) return;
      logger.warn(cleaned, context);
    },
    error: (message, error, context) => {
      const cleaned = sanitizeAnalysisMessage(message) || message;
      logger.error(cleaned, error ?? context);
    },
  };
}
