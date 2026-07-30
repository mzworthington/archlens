import { describe, expect, it } from 'vitest';
import {
  churnAccelerationRatio,
  churnAccelerationTone,
  formatChurnAcceleration,
} from './churnAcceleration';

describe('churnAccelerationRatio', () => {
  it('compares 30d churn to the long-window monthly average', () => {
    expect(churnAccelerationRatio(5, 6)).toBeCloseTo(10, 5);
    expect(churnAccelerationRatio(1, 12)).toBeCloseTo(1, 5);
  });

  it('returns null when either window has no churn', () => {
    expect(churnAccelerationRatio(0, 10)).toBeNull();
    expect(churnAccelerationRatio(3, 0)).toBeNull();
  });
});

describe('formatChurnAcceleration', () => {
  it('formats ratios for display', () => {
    expect(formatChurnAcceleration(10.2)).toBe('10× monthly');
    expect(formatChurnAcceleration(3.4)).toBe('3.4× monthly');
    expect(formatChurnAcceleration(1.2)).toBe('1.20× monthly');
  });
});

describe('churnAccelerationTone', () => {
  it('escalates tone for high acceleration', () => {
    expect(churnAccelerationTone(1)).toBe('none');
    expect(churnAccelerationTone(2.5)).toBe('warning');
    expect(churnAccelerationTone(5)).toBe('danger');
  });
});
