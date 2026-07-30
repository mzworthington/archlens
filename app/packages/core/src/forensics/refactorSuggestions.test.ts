import { describe, expect, it } from 'vitest';
import type { RefactorBoundary } from './refactorBoundary';
import { buildRefactorSuggestions } from './refactorSuggestions';

function boundary(
  partial: Partial<RefactorBoundary> & Pick<RefactorBoundary, 'signals'>
): RefactorBoundary {
  return {
    id: 'a|b',
    seedEntityRef: 'app/a',
    seedName: 'A',
    members: [
      { entityRef: 'app/a', name: 'A', filepath: 'src/a.ts', refactorScore: 40 },
      { entityRef: 'app/b', name: 'B', filepath: 'src/b.ts', refactorScore: 30 },
    ],
    memberEntityRefs: ['app/a', 'app/b'],
    memberFilepaths: ['src/a.ts', 'src/b.ts'],
    aggregateRefactorScore: 70,
    rationale: [],
    spansContainers: false,
    ...partial,
  };
}

describe('buildRefactorSuggestions', () => {
  it('suggests extracting shared logic when files are highly coupled', () => {
    const suggestions = buildRefactorSuggestions(
      boundary({ signals: ['high-coupling', 'hotspot'] })
    );
    const extract = suggestions.find(s => s.kind === 'extract-shared-logic');
    expect(extract).toBeDefined();
    expect(extract?.relatedSections).toContain('coupled-files');
    expect(extract?.relatedSections).toContain('boundary-members');
  });

  it('suggests splitting by container when boundary spans containers', () => {
    const suggestions = buildRefactorSuggestions(
      boundary({ signals: ['cross-container', 'high-coupling'], spansContainers: true })
    );
    expect(suggestions.some(s => s.kind === 'split-by-container')).toBe(true);
    expect(suggestions.some(s => s.kind === 'define-api-boundary')).toBe(true);
  });

  it('suggests adding a second owner for knowledge silos or solo ownership', () => {
    const silo = buildRefactorSuggestions(boundary({ signals: ['knowledge-silo'] }));
    expect(silo.some(s => s.kind === 'add-second-owner')).toBe(true);
    expect(silo.find(s => s.kind === 'add-second-owner')?.relatedSections).toContain('ownership');

    const solo = buildRefactorSuggestions(boundary({ signals: ['hotspot'] }), {
      ownership: {
        concentration: 'solo',
        authors: [{ email: 'solo@ex.com', commits: 10, percent: 1 }],
      },
    });
    expect(solo.some(s => s.kind === 'add-second-owner')).toBe(true);
  });

  it('suggests coordinating ownership when ownership is distributed', () => {
    const suggestions = buildRefactorSuggestions(
      boundary({ signals: ['distributed-ownership', 'high-coupling'] })
    );
    expect(suggestions.some(s => s.kind === 'coordinate-ownership')).toBe(true);
  });

  it('orders suggestions by priority descending', () => {
    const suggestions = buildRefactorSuggestions(
      boundary({
        signals: ['cross-container', 'high-coupling', 'knowledge-silo'],
        spansContainers: true,
      }),
      {
        ownership: {
          concentration: 'solo',
          authors: [{ email: 'solo@ex.com', commits: 10, percent: 1 }],
        },
      }
    );
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].priority).toBeGreaterThanOrEqual(suggestions[i].priority);
    }
  });
});
