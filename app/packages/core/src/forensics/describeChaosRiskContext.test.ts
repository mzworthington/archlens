import { describe, expect, it } from 'vitest';
import { describeChaosRiskContext } from './describeChaosRiskContext';

describe('describeChaosRiskContext', () => {
  it('summarizes critical-path blast exposure', () => {
    expect(
      describeChaosRiskContext({
        blastRadius: 0.62,
        onCriticalPath: true,
        isSpof: false,
        safeguardCoverage: 0.75,
      })
    ).toBe('on blast-radius path · 62% blast heat');
  });

  it('includes SPOF and safeguard gaps', () => {
    expect(
      describeChaosRiskContext({
        blastRadius: 0.1,
        onCriticalPath: false,
        isSpof: true,
        safeguardCoverage: 0,
      })
    ).toBe('structural SPOF · 10% blast heat · weak safeguards');
  });
});
