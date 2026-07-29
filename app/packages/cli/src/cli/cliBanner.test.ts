import { describe, expect, it, vi } from 'vitest';
import { formatAnalysisSpinnerMessage, formatSuccessOutro, renderCliBanner } from './cliBanner.ts';

describe('cliBanner', () => {
  it('renders banner without throwing', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderCliBanner('v0.1.45');
    expect(log).toHaveBeenCalled();
    const output = log.mock.calls.map(call => String(call[0])).join('\n');
    expect(output).toContain('ARCH');
    expect(output).toContain('LENS');
    expect(output).toContain('0.1.45');
    log.mockRestore();
  });

  it('formats success and spinner copy', () => {
    expect(formatSuccessOutro('/tmp/blueprints')).toContain('/tmp/blueprints');
    expect(formatAnalysisSpinnerMessage(true)).toContain('Git');
    expect(formatAnalysisSpinnerMessage(false)).toContain('diagrams');
  });
});
