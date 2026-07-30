import { describe, expect, it } from 'vitest';
import { formatValidationResult } from './formatValidationResult.ts';
import { formatBlueprintTreeDiff } from './formatBlueprintTreeDiff.ts';

describe('formatValidationResult', () => {
  it('renders json output', () => {
    const output = formatValidationResult(
      { isValid: false, issues: [], filesChecked: 1 },
      [{ path: 'bad.yaml', message: 'parse failed' }],
      'json'
    );
    expect(JSON.parse(output)).toMatchObject({
      isValid: false,
      issues: [{ type: 'schema-error', message: 'parse failed' }],
    });
  });

  it('renders human text for success', () => {
    const output = formatValidationResult(
      { isValid: true, issues: [], filesChecked: 2 },
      [],
      'text'
    );
    expect(output).toContain('2 blueprint file(s) passed validation');
  });
});

describe('formatBlueprintTreeDiff', () => {
  it('renders added nodes in text mode', () => {
    const output = formatBlueprintTreeDiff(
      {
        files: [
          {
            relativePath: 'context.yaml',
            status: 'modified',
            diff: {
              nodes: {
                added: [
                  {
                    entityRef: 'demo/api',
                    name: 'API',
                    type: 'rest-api',
                    properties: {},
                    filePath: 'context.yaml',
                  },
                ],
                modified: [],
                deleted: [],
              },
              dependencies: { added: [], deleted: [] },
            },
          },
        ],
      },
      'text'
    );
    expect(output).toContain('context.yaml');
    expect(output).toContain('demo/api');
  });
});
