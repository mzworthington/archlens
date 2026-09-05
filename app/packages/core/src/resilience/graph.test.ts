import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { buildDependents, expandEndpoints, resolveFaultTargets, type GraphKernel } from './graph';
import { runResilienceSimulation } from './simulation';

const groupSchema: SystemSchema = {
  name: 'Group demo',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'demo/user', name: 'User', type: 'person' },
    { entityRef: 'demo/hub', name: 'Hub', type: 'group' },
    {
      entityRef: 'demo/api',
      name: 'API',
      type: 'microservice',
      parentEntityRef: 'demo/hub',
    },
    {
      entityRef: 'demo/db',
      name: 'DB',
      type: 'database',
      parentEntityRef: 'demo/hub',
    },
  ],
  dependencies: [{ from: 'demo/user', to: 'demo/hub', type: 'direct-call' }],
};

describe('resilience graph', () => {
  it('walks group edges from topology without schema metadata', () => {
    const kernel: GraphKernel = {
      nodes: [
        { entityRef: 'demo/user', type: 'person' },
        { entityRef: 'demo/hub', type: 'group' },
        { entityRef: 'demo/api', type: 'microservice', parentEntityRef: 'demo/hub' },
        { entityRef: 'demo/db', type: 'database', parentEntityRef: 'demo/hub' },
      ],
      dependencies: [{ from: 'demo/user', to: 'demo/hub', type: 'direct-call' }],
    };

    expect(expandEndpoints('demo/hub', kernel)).toEqual(['demo/api', 'demo/db']);
    expect(buildDependents(kernel).get('demo/api')).toContain('demo/user');
    expect(resolveFaultTargets('demo/hub', kernel)).toEqual(['demo/api', 'demo/db']);
  });

  it('expands group targets on dependency edges', () => {
    expect(expandEndpoints('demo/hub', groupSchema)).toEqual(['demo/api', 'demo/db']);
    expect(expandEndpoints('demo/user', groupSchema)).toEqual(['demo/user']);
  });

  it('maps callers to expanded group children', () => {
    const dependents = buildDependents(groupSchema);
    expect(dependents.get('demo/api')).toContain('demo/user');
    expect(dependents.get('demo/db')).toContain('demo/user');
  });

  it('does not treat provisions edges as availability callers', () => {
    const schema: SystemSchema = {
      name: 'IaC',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'sys/iac-pages',
          name: 'PagesProject',
          type: 'component',
          properties: { 'iac.view': 'declaration' },
        },
        {
          entityRef: 'sys/cloudflare-pages',
          name: 'Cloudflare Pages',
          type: 'gateway-api',
          external: true,
          properties: { classification: 'third-party', 'iac.view': 'resource' },
        },
      ],
      dependencies: [
        {
          from: 'sys/iac-pages',
          to: 'sys/cloudflare-pages',
          type: 'provisions',
        },
      ],
    };
    const dependents = buildDependents(schema);
    expect(dependents.get('sys/cloudflare-pages')).toBeUndefined();
  });

  it('resolves group fault targets to child nodes', () => {
    expect(resolveFaultTargets('demo/hub', groupSchema)).toEqual(['demo/api', 'demo/db']);
    expect(resolveFaultTargets('demo/api', groupSchema)).toEqual(['demo/api']);
  });

  it('propagates fault impact to callers through group boundaries', () => {
    const result = runResilienceSimulation(groupSchema, {
      faults: [{ nodeId: 'demo/api', faultType: 'region-outage' }],
      entryPoints: ['demo/user'],
    });

    expect((result.heat.get('demo/user') ?? 0) > 0).toBe(true);
  });
});
