import { describe, expect, it } from 'vitest';
import { buildForensicsPanelModel } from './buildForensicsPanelModel';

describe('buildForensicsPanelModel', () => {
  it('includes composite risk when blast radius is available', () => {
    const model = buildForensicsPanelModel({
      forensics: {
        hotspotScore: 0.8,
        complexity: 20,
        churn: 5,
        classifications: ['hotspot'],
      },
      blastRadius: 0.5,
    });

    expect(model.concern.level).toBe('danger');
    expect(model.compositeRiskScore).toBeCloseTo(0.4);
    expect(model.metricRows.some(row => row.label === 'compositeRisk')).toBe(true);
  });

  it('derives focusable coupling count from focus or coupled files', () => {
    const model = buildForensicsPanelModel({
      forensics: {
        coupledFiles: [
          { path: 'src/b.ts', score: 0.8, sharedCommits: 3 },
          { path: 'src/c.ts', score: 0.6, sharedCommits: 2 },
        ],
      },
      focusCouplingCount: 0,
      linkedCouplingCount: 1,
    });

    expect(model.focusableCouplingCount).toBe(2);
    expect(model.coupledFilesPreview).toHaveLength(2);
  });

  it('includes extended complexity and line churn metrics when present', () => {
    const model = buildForensicsPanelModel({
      forensics: {
        complexity: 12,
        complexityPeak: 18,
        cognitiveComplexity: 22,
        functionCount: 7,
        lineChurn: 340,
        churn: 4,
      },
    });

    expect(model.metricRows.map(row => row.label)).toEqual(
      expect.arrayContaining([
        'complexity',
        'complexityPeak',
        'cognitiveComplexity',
        'functionCount',
        'churn',
        'lineChurn',
      ])
    );
  });
});
