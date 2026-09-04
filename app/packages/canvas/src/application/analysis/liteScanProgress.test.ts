import { describe, expect, it } from 'vitest';
import {
  formatByteCount,
  formatLiteScanByteProgress,
  formatLiteScanFileProgress,
  isLiteScanByteBudgetBinding,
  liteScanProgressLabel,
  type LiteScanProgress,
} from './liteScanProgress';

const reading: LiteScanProgress = {
  phase: 'reading',
  filesScanned: 147,
  fileCap: 300,
  bytesRead: 2_000_000,
  byteCap: 8_000_000,
};

describe('liteScanProgress', () => {
  it('formats file counts against the cap and walking discovery separately', () => {
    expect(formatLiteScanFileProgress(reading)).toBe('147 / 300 files');
    expect(
      formatLiteScanFileProgress({
        ...reading,
        phase: 'walking',
        filesScanned: 40,
      })
    ).toBe('40 files found (cap 300)');
  });

  it('formats the 8 MB byte budget in decimal megabytes', () => {
    expect(formatByteCount(8_000_000)).toBe('8.0 MB');
    expect(formatLiteScanByteProgress(reading)).toBe('2.0 MB of 8.0 MB');
  });

  it('treats the byte budget as binding after the walk, not during discovery', () => {
    expect(isLiteScanByteBudgetBinding({ ...reading, phase: 'walking', bytesRead: 0 })).toBe(false);
    expect(isLiteScanByteBudgetBinding(reading)).toBe(true);
    expect(isLiteScanByteBudgetBinding({ ...reading, phase: 'analyzing', bytesRead: 0 })).toBe(
      true
    );
  });

  it('names each phase for accessible status copy', () => {
    expect(liteScanProgressLabel({ ...reading, phase: 'walking' })).toMatch(/folder/i);
    expect(liteScanProgressLabel(reading)).toMatch(/Reading/i);
    expect(liteScanProgressLabel({ ...reading, phase: 'analyzing' })).toMatch(/Building map/i);
  });
});
