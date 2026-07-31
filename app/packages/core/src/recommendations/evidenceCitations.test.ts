import { describe, expect, it } from 'vitest';
import { listEvidenceCitations } from './evidenceCitations';

describe('listEvidenceCitations', () => {
  it('lists stable keys for forensics and simulation evidence', () => {
    const citations = listEvidenceCitations({
      compositeRiskScore: 0.42,
      forensics: {
        hotspotScore: 0.9,
        complexity: 22,
        churn: 8,
        classifications: ['hotspot', 'knowledge-silo'],
      },
      simulation: {
        blastRadius: 0.82,
        isSpof: true,
        overallSla: 72,
      },
    });

    expect(citations).toContain('compositeRiskScore:0.42');
    expect(citations).toContain('hotspotScore:0.90');
    expect(citations).toContain('classification:hotspot');
    expect(citations).toContain('classification:knowledge-silo');
    expect(citations).toContain('blastRadius:0.82');
    expect(citations).toContain('isSpof:true');
    expect(citations).toContain('overallSla:72.00');
  });

  it('returns empty list for empty evidence', () => {
    expect(listEvidenceCitations({})).toEqual([]);
  });
});
