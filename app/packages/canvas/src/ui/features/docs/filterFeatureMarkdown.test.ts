import { describe, expect, it } from 'vitest';
import { countFeatureMatches, filterFeatureMarkdown } from './filterFeatureMarkdown';

const SAMPLE = `# Unit test features

Intro line.

## Core
### entityRef
#### Rules
 - ✅ parses refs
## Canvas
### Workspace
 - ✅ collapses panels
 - ✅ zooms into containers
### Layout
#### Dagre
 - ✅ places nodes
 - ❌ fails on cycles
`;

describe('filterFeatureMarkdown', () => {
  it('returns the original markdown when the query is empty', () => {
    expect(filterFeatureMarkdown(SAMPLE, '')).toBe(SAMPLE);
    expect(filterFeatureMarkdown(SAMPLE, '   ')).toBe(SAMPLE);
  });

  it('keeps matching list items and their ancestor headings', () => {
    const filtered = filterFeatureMarkdown(SAMPLE, 'zooms');
    expect(filtered).toContain('# Unit test features');
    expect(filtered).toContain('## Canvas');
    expect(filtered).toContain('### Workspace');
    expect(filtered).toContain('✅ zooms into containers');
    expect(filtered).not.toContain('collapses panels');
    expect(filtered).not.toContain('## Core');
  });

  it('keeps all descendants under a matching heading', () => {
    const filtered = filterFeatureMarkdown(SAMPLE, 'canvas');
    expect(filtered).toContain('## Canvas');
    expect(filtered).toContain('### Workspace');
    expect(filtered).toContain('collapses panels');
    expect(filtered).toContain('### Layout');
    expect(filtered).toContain('places nodes');
  });

  it('keeps parent package/file headings when a nested suite matches', () => {
    const filtered = filterFeatureMarkdown(SAMPLE, 'dagre');
    expect(filtered).toContain('## Canvas');
    expect(filtered).toContain('### Layout');
    expect(filtered).toContain('#### Dagre');
    expect(filtered).toContain('places nodes');
    expect(filtered).not.toContain('### Workspace');
  });

  it('counts matching feature list items', () => {
    expect(countFeatureMatches(SAMPLE, '')).toBe(5);
    expect(countFeatureMatches(SAMPLE, 'places')).toBe(1);
    expect(countFeatureMatches(SAMPLE, 'canvas')).toBe(4);
  });

  it('package mode keeps only the matching top-level ## section', () => {
    const withFalsePositive = `${SAMPLE}
## CLI
### csharpGrouping
 - ✅ skips GlobalUsings, Migrations, Designer and ModelSnapshot files
`;
    const textMode = filterFeatureMarkdown(withFalsePositive, 'Designer', 'text');
    expect(textMode).toContain('## CLI');
    expect(textMode).not.toContain('## Canvas');

    const packageMode = filterFeatureMarkdown(withFalsePositive, 'Canvas', 'package');
    expect(packageMode).toContain('## Canvas');
    expect(packageMode).toContain('collapses panels');
    expect(packageMode).not.toContain('## CLI');
    expect(packageMode).not.toContain('ModelSnapshot');
  });
});
