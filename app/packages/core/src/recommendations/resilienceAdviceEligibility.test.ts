import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import {
  isAdviceActionable,
  isEstateResilienceDiagramLevel,
  isResilienceAdviceTarget,
  isResilienceSimulationDiagramLevel,
  isThirdPartyDependency,
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
    { entityRef: 'shop/events', name: 'Events Bus', type: 'event-broker' },
    {
      entityRef: 'shop/lambda',
      name: 'Lambda',
      type: 'serverless-function',
      properties: {
        filepath: 'main.tf',
        'iac.address': 'aws_lambda_function.api',
        'iac.provider_type': 'aws_lambda_function',
        'iac.kind': 'resource',
      },
    },
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

describe('isResilienceSimulationDiagramLevel', () => {
  it('matches estate resilience diagram levels', () => {
    expect(isResilienceSimulationDiagramLevel('context')).toBe(true);
    expect(isResilienceSimulationDiagramLevel('container')).toBe(true);
    expect(isResilienceSimulationDiagramLevel('component')).toBe(false);
    expect(isResilienceSimulationDiagramLevel('code')).toBe(false);
  });
});

describe('isResilienceAdviceTarget', () => {
  it('allows calling application services and workers', () => {
    expect(isResilienceAdviceTarget(containerSchema, 'shop/api')).toBe(true);
  });

  it('excludes shared infrastructure and data stores', () => {
    expect(isResilienceAdviceTarget(containerSchema, 'shop/api/db')).toBe(false);
    expect(isResilienceAdviceTarget(containerSchema, 'shop/events')).toBe(false);
  });

  it('excludes IaC-imported resources', () => {
    expect(isResilienceAdviceTarget(containerSchema, 'shop/lambda')).toBe(false);
  });

  it('excludes structural component and code-module nodes', () => {
    expect(isResilienceAdviceTarget(componentSchema, 'shop/api/handlers')).toBe(false);
    expect(isResilienceAdviceTarget(componentSchema, 'shop/api/repo')).toBe(false);
  });

  it('excludes human actors and third-party vendors', () => {
    const contextSchema: SystemSchema = {
      name: 'Estate',
      version: '1.0.0',
      level: 'context',
      nodes: [
        { entityRef: 'shop/shopper', name: 'Shopper', type: 'person' },
        {
          entityRef: 'shop/gateway',
          name: 'Payment Gateway',
          type: 'gateway-api',
          external: true,
          properties: { classification: 'third-party' },
        },
        { entityRef: 'shop/api', name: 'Checkout API', type: 'microservice' },
      ],
      dependencies: [],
    };

    expect(isResilienceAdviceTarget(contextSchema, 'shop/shopper')).toBe(false);
    expect(isResilienceAdviceTarget(contextSchema, 'shop/gateway')).toBe(false);
    expect(isResilienceAdviceTarget(contextSchema, 'shop/api')).toBe(true);
    expect(isAdviceActionable(contextSchema, 'shop/shopper')).toBe(false);
    expect(isThirdPartyDependency(contextSchema, 'shop/gateway')).toBe(true);
    expect(isThirdPartyDependency(contextSchema, 'shop/api')).toBe(false);
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
