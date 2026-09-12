import { describe, expect, it } from 'vitest';
import {
  ContentComplexityAdapter,
  ContentImportGraphAdapter,
  estimateControlFlowComplexity,
} from './contentAdapters';
import { DEFAULT_FORENSICS_OPTIONS } from './options';

describe('estimateControlFlowComplexity', () => {
  it('counts branching keywords as cyclomatic-like complexity', () => {
    const text = `
      export function run(x: number) {
        if (x > 1) return 1;
        for (const n of [1]) {
          if (n) return n;
        }
      }
    `;
    expect(estimateControlFlowComplexity(text)).toBe(1 + 3);
  });
});

describe('ContentComplexityAdapter', () => {
  it('counts loc and skips AST complexity when asked', async () => {
    const adapter = new ContentComplexityAdapter(
      new Map([
        ['hot.ts', 'if (a) { return 1 }'],
        ['cold.ts', 'export const n = 1;'],
      ])
    );

    const metrics = await adapter.analyze(['hot.ts', 'cold.ts'], {
      ...DEFAULT_FORENSICS_OPTIONS,
      skipAstPaths: ['cold.ts'],
    });

    expect(metrics.find(m => m.path === 'hot.ts')?.complexity).toBeGreaterThan(1);
    expect(metrics.find(m => m.path === 'cold.ts')).toMatchObject({
      complexity: 0,
      loc: 1,
      sloc: 1,
    });
  });
});

describe('ContentImportGraphAdapter', () => {
  it('extracts relative TS imports from in-memory sources', async () => {
    const adapter = new ContentImportGraphAdapter(
      new Map([['src/a.ts', "import { b } from './b';\n"]])
    );
    const imports = await adapter.extractImports(['src/a.ts'], DEFAULT_FORENSICS_OPTIONS);
    expect(imports.get('src/a.ts')).toContain('./b');
  });
});
