import { describe, it, expect, vi } from 'vitest';
import { createAnalysisLogger, sanitizeAnalysisMessage } from './analysisLogger';

describe('analysisLogger', () => {
  it('strips emoji chrome from analyzer messages', () => {
    expect(sanitizeAnalysisMessage('🔍 Scanning sources')).toBe('Scanning sources');
  });

  it('forwards cleaned messages and drops empty info lines', () => {
    const info = vi.fn();
    const logger = createAnalysisLogger({
      info,
      warn: () => undefined,
      error: () => undefined,
    });

    logger.info('🔍 ');
    logger.info('✅ Done', { files: 2 });

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('Done', { files: 2 });
  });
});
