import { describe, expect, it } from 'vitest';
import { componentsInContainer, componentsInSystem } from './membership.ts';

describe('componentsInContainer', () => {
  it('matches components by containerId leaf or parent entityRef', () => {
    const domain = { entityRef: 'sys/svc/domain' };
    const byContainerId = {
      entityRef: 'sys/svc/other/foo',
      properties: { containerId: 'domain' },
    };
    const byParent = { entityRef: 'sys/svc/domain/bar' };
    const unrelated = { entityRef: 'sys/svc/other/baz', properties: { containerId: 'other' } };

    expect(componentsInContainer(domain, [byContainerId, byParent, unrelated])).toEqual([
      byContainerId,
      byParent,
    ]);
  });

  it('returns no components for an empty graph', () => {
    expect(componentsInContainer({ entityRef: 'sys/svc/domain' }, [])).toEqual([]);
  });
});

describe('componentsInSystem', () => {
  it('matches components under the system prefix', () => {
    const system = { entityRef: 'sys/svc' };
    const child = { entityRef: 'sys/svc/domain/foo' };
    const self = { entityRef: 'sys/svc' };
    const sibling = { entityRef: 'sys/other/domain/foo' };

    expect(componentsInSystem(system, [child, self, sibling])).toEqual([child, self]);
  });

  it('returns no components for an empty graph', () => {
    expect(componentsInSystem({ entityRef: 'sys/svc' }, [])).toEqual([]);
  });
});
