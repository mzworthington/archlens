import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseC4 } from './c4';
import { parseFlowchart } from './flowchart';
import { extractMermaidFromMarkdown } from './markdown';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../../');

describe('Mermaid import parts', () => {
  it('parses C4 in the C4 module', () => {
    const result = parseC4(
      `C4Context
    Person(user, "Banking Customer")
    System(banking, "Internet Banking System")
    Rel(user, banking, "Uses")`,
      'c4-context',
      { targetLevel: 'context' }
    );

    expect(result.schema.nodes.find(n => n.entityRef === 'user')).toMatchObject({
      type: 'person',
      name: 'Banking Customer',
    });
  });

  it('parses flowcharts in the flowchart module', () => {
    const result = parseFlowchart(
      `graph TD
    Gateway["Gateway Node"]
    DB[("DB Node")]
    Gateway --> DB`,
      { targetLevel: 'container' }
    );

    expect(result.format).toBe('flowchart');
    expect(result.schema.nodes.find(n => n.entityRef === 'gateway')).toMatchObject({
      name: 'Gateway Node',
      type: 'microservice',
    });
  });

  it('extracts fenced mermaid from the markdown module', () => {
    const md = '```mermaid\ngraph TD\n  A --> B\n```';
    expect(extractMermaidFromMarkdown(md)).toContain('graph TD');
  });

  it('keeps canvas mermaid wizard as a core delegate', () => {
    const files = [
      'app/packages/canvas/src/application/store/states/diagramState/importMermaid.ts',
      'app/packages/canvas/src/ui/features/workspace/components/ImportMermaidDialog/useImportMermaidDialog.ts',
      'app/packages/canvas/src/ui/features/workspace/components/ImportMermaidDialog/ImportMermaidDialog.tsx',
    ];
    const src = files.map(file => readFileSync(join(REPO_ROOT, file), 'utf8')).join('\n');
    expect(src).toContain('parseMermaidToSchema');
    expect(src).toContain('extractMermaidFromMarkdown');
    expect(src).not.toMatch(/Person\s*\(/);
    expect(src).not.toContain('ContainerDb');
    expect(src).not.toContain('parseFlowchartNode');
  });
});
