import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { buildDependents, expandEndpoints, resolveFaultTargets } from './graph';
import { runResilienceSimulation } from './simulation';

const groupSchema: SystemSchema = {
  name: 'Group demo',
  apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
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
  it('expands group targets on dependency edges', () => {
    expect(expandEndpoints('demo/hub', groupSchema)).toEqual(['demo/api', 'demo/db']);
    expect(expandEndpoints('demo/user', groupSchema)).toEqual(['demo/user']);
  });

  it('maps callers to expanded group children', () => {
    const dependents = buildDependents(groupSchema);
    expect(dependents.get('demo/api')).toContain('demo/user');
    expect(dependents.get('demo/db')).toContain('demo/user');
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
