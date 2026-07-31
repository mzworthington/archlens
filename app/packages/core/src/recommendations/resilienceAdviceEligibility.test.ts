import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import {
  isEstateResilienceDiagramLevel,
  isResilienceAdviceTarget,
  resolveAdviceApplicability,
} from './resilienceAdviceEligibility';

const containerSchema: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  entityRef: 'shop/api',
  nodes: [
    { entityRef: 'shop/api', name: 'API', type: 'microservice' },
    { entityRef: 'shop/api/db', name: 'Database', type: 'database' },
  ],
  dependencies: [{ from: 'shop/api', to: 'shop/api/db', type: 'read-write' }],
};

const componentSchema: SystemSchema = {
  name: 'API components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'shop/api',
  nodes: [
    { entityRef: 'shop/api/handlers', name: 'Handlers', type: 'component' },
    { entityRef: 'shop/api/repo', name: 'Repository', type: 'code-module' },
  ],
  dependencies: [{ from: 'shop/api/handlers', to: 'shop/api/repo', type: 'direct-call' }],
};

describe('isEstateResilienceDiagramLevel', () => {
  it('includes context and container diagrams', () => {
    expect(isEstateResilienceDiagramLevel('context')).toBe(true);
    expect(isEstateResilienceDiagramLevel('container')).toBe(true);
  });

  it('excludes component and code diagrams from estate resilience simulation', () => {
    expect(isEstateResilienceDiagramLevel('component')).toBe(false);
    expect(isEstateResilienceDiagramLevel('code')).toBe(false);
  });
});

describe('isResilienceAdviceTarget', () => {
  it('allows runtime service and data nodes', () => {
    expect(isResilienceAdviceTarget(containerSchema, 'shop/api')).toBe(true);
    expect(isResilienceAdviceTarget(containerSchema, 'shop/api/db')).toBe(true);
  });

  it('excludes structural component and code-module nodes', () => {
    expect(isResilienceAdviceTarget(componentSchema, 'shop/api/handlers')).toBe(false);
    expect(isResilienceAdviceTarget(componentSchema, 'shop/api/repo')).toBe(false);
  });
});

describe('resolveAdviceApplicability', () => {
  it('keeps eligible nodes as their own scope', () => {
    expect(resolveAdviceApplicability(containerSchema, 'shop/api')).toEqual({
      adviceTargetEntityRef: 'shop/api',
      adviceTargetName: 'API',
      scopeEntityRef: 'shop/api',
      scopeName: 'API',
    });
  });

  it('rolls code-level contributors up to the owning container', () => {
    const applicability = resolveAdviceApplicability(componentSchema, 'shop/api/repo');
    expect(applicability.adviceTargetEntityRef).toBe('shop/api');
    expect(applicability.contributorEntityRef).toBe('shop/api/repo');
    expect(applicability.contributorName).toBe('Repository');
  });
});
