import { describe, expect, it } from 'vitest';
import { formatArchitectureHealthResult } from './formatArchitectureHealth.ts';

describe('formatArchitectureHealthResult', () => {
  it('formats actionable findings in text mode', () => {
    const text = formatArchitectureHealthResult({
      format: 'text',
      report: {
        isHealthy: false,
        filesChecked: 1,
        summary: { cycles: 1, hotspots: 0, knowledgeSilos: 0, heating: 0 },
        findings: [
          {
            kind: 'cycle',
            file: 'a.yaml',
            title: 'Circular dependency',
            action: 'Break the cycle',
            path: ['x', 'y', 'x'],
          },
        ],
      },
    });

    expect(text).toContain('Fix in the codebase');
    expect(text).toContain('Break the cycle');
    expect(text).toContain('x ➔ y ➔ x');
  });

  it('includes regression deltas in json mode', () => {
    const json = formatArchitectureHealthResult({
      format: 'json',
      baselineLabel: 'HEAD~1',
      report: {
        isHealthy: false,
        filesChecked: 1,
        summary: { cycles: 1, hotspots: 1, knowledgeSilos: 0, heating: 0 },
        findings: [],
      },
      regression: {
        deteriorated: true,
        deltas: { cycles: 1, hotspots: 1, knowledgeSilos: 0, heating: 0 },
        newFindings: [
          {
            kind: 'hotspot',
            title: 'Hotspot: Cart',
            action: 'Split the module',
            entityRef: 'acme/cart',
          },
        ],
        resolvedFindings: [],
      },
    });

    const payload = JSON.parse(json) as {
      deteriorated: boolean;
      baseline: string;
      regression: { deltas: { hotspots: number } };
    };
    expect(payload.deteriorated).toBe(true);
    expect(payload.baseline).toBe('HEAD~1');
    expect(payload.regression.deltas.hotspots).toBe(1);
  });
});
