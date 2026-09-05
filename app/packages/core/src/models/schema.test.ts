import { describe, it, expect } from 'vitest';
import {
  EntityRef,
  slugify,
  type SystemSchema,
  type SystemNode,
  type SystemDependency,
} from './schema';

describe('slugify Helper Utility', () => {
  it('should transform spaces to hyphens and drop special characters', () => {
    expect(slugify('My Super API!')).toBe('my-super-api');
    expect(slugify('order---service')).toBe('order-service');
    expect(slugify('  Trim Me Now  ')).toBe('trim-me-now');
  });
});

describe('End-to-End Schema Validation Test', () => {
  it('should naturally flow slugified strings through integrated dependency configurations', () => {
    const systemContext = 'My System Context';
    const contextRef = EntityRef.parse(systemContext);

    const apiRef = EntityRef.parse('Core Gateway', contextRef);
    const cacheRef = EntityRef.parse('Redis Cache', contextRef);

    const node1: SystemNode = {
      entityRef: apiRef,
      type: 'gateway-api',
      name: 'Core Gateway',
    };

    const node2: SystemNode = {
      entityRef: cacheRef,
      type: 'cache-store',
      name: 'Redis Cache',
    };

    const dependency: SystemDependency = {
      from: apiRef,
      to: cacheRef,
      type: 'direct-call',
      description: 'Reads user fast state profiles',
    };

    const schema: SystemSchema = {
      entityRef: contextRef,
      name: 'E2E Testing System',
      version: '1.0.0',
      level: 'container',
      nodes: [node1, node2],
      dependencies: [dependency],
    };

    expect(schema.entityRef).toBe('my-system-context');
    expect(schema.dependencies[0].from).toBe('my-system-context/core-gateway');
    expect(schema.dependencies[0].to).toBe('my-system-context/redis-cache');
  });
});
