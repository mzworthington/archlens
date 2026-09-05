import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { rankForensicsOffenders } from '../rankOffenders';
import {
  buildTraceLensScopeOptions,
  filterTraceLensScopeOptions,
  findTraceLensScopeOption,
} from './buildTraceLensScopeOptions';

const componentSchema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'Canvas Components',
  version: '1.0.0',
  level: 'component',
  nodes,
  dependencies: [],
});

const containerSchema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'App Containers',
  version: '1.0.0',
  level: 'container',
  nodes,
  dependencies: [],
});

describe('buildTraceLensScopeOptions', () => {
  it('includes structural entities and offenders with subtree counts', () => {
    const systems = [
      {
        path: 'containers.yaml',
        name: 'containers',
        schema: containerSchema([
          {
            entityRef: 'app/canvas',
            name: 'Canvas',
            type: 'container',
            forensics: { hotspotScore: 0.4, hotspotCount: 2 },
          },
        ]),
      },
      {
        path: 'canvas-components.yaml',
        name: 'canvas',
        schema: componentSchema([
          {
            entityRef: 'app/canvas/db',
            name: 'DB Layer',
            type: 'component',
            properties: { containerId: 'canvas' },
            forensics: { hotspotScore: 0.85, classifications: ['hotspot'] },
          },
          {
            entityRef: 'app/cli/run',
            name: 'CLI Run',
            type: 'component',
            forensics: { hotspotScore: 0.2 },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'all');
    const options = buildTraceLensScopeOptions(systems, [], ranked);

    const canvasPkg = findTraceLensScopeOption(options, 'app/canvas');
    const db = findTraceLensScopeOption(options, 'app/canvas/db');
    const cli = findTraceLensScopeOption(options, 'app/cli/run');

    expect(canvasPkg?.offenderCount).toBe(1);
    expect(db?.offenderCount).toBe(1);
    expect(cli?.offenderCount).toBe(1);
    expect(options.map(option => option.entityRef)).toContain('app/canvas');
    expect(options.map(option => option.entityRef)).toContain('app/canvas/db');
  });

  it('filters options by name, entity ref or level', () => {
    const options = [
      {
        entityRef: 'app/canvas',
        name: 'Canvas',
        level: 'container' as const,
        depth: 2,
        offenderCount: 3,
      },
      {
        entityRef: 'app/cli',
        name: 'CLI',
        level: 'container' as const,
        depth: 2,
        offenderCount: 1,
      },
    ];

    expect(filterTraceLensScopeOptions(options, 'canvas')).toHaveLength(1);
    expect(filterTraceLensScopeOptions(options, 'app/cli')).toHaveLength(1);
    expect(filterTraceLensScopeOptions(options, 'container')).toHaveLength(2);
  });
});
