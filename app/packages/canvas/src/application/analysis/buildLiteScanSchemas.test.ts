import { describe, it, expect } from 'vitest';
import {
  buildLiteScanSchemas,
  containerLeafFromPath,
  slugifySegment,
} from './buildLiteScanSchemas';
import { parseSchemaFromYaml } from '@archlens/core';

describe('buildLiteScanSchemas', () => {
  it('slugifies workspace names', () => {
    expect(slugifySegment('My App!')).toBe('my-app');
    expect(containerLeafFromPath('packages/core/src/index.ts')).toBe('core');
    expect(containerLeafFromPath('src/application/store.ts')).toBe('application');
  });

  it('builds context, container, and component YAML with import edges', () => {
    const result = buildLiteScanSchemas(
      [
        {
          relativePath: 'packages/api/src/server.ts',
          content: `import { handler } from '../handler';\n`,
        },
        {
          relativePath: 'packages/api/handler.ts',
          content: `export function handler() {}\n`,
        },
        {
          relativePath: 'packages/web/src/app.ts',
          content: `import { handler } from '../../api/handler';\n`,
        },
      ],
      { workspaceName: 'demo-repo' }
    );

    expect(result.contextEntityRef).toBe('demo-repo');
    expect(result.fileCount).toBe(3);
    expect(result.files.some(f => f.name === 'demo-repo/context.yaml')).toBe(true);
    expect(result.files.some(f => f.name === 'demo-repo/app/containers.yaml')).toBe(true);

    const containers = parseSchemaFromYaml(
      result.files.find(f => f.name.endsWith('containers.yaml'))!.content
    );
    expect(containers.level).toBe('container');
    expect(containers.nodes.map(n => n.entityRef)).toEqual(
      expect.arrayContaining(['demo-repo/app/api', 'demo-repo/app/web'])
    );
    expect(
      containers.dependencies.some(d => d.from.includes('/web') && d.to.includes('/api'))
    ).toBe(true);
  });
});
