import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { validateGraph, dedupeDependencies } from './graphValidate';
import type { SystemSchema } from '../models/schema';

const graphValidateSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'graphValidate.ts'),
  'utf8'
);

describe('dedupeDependencies', () => {
  it('keeps the first edge for each from→to pair', () => {
    const deps = dedupeDependencies([
      { from: 'a', to: 'b', type: 'direct-call', description: 'first' },
      { from: 'a', to: 'b', type: 'direct-call', description: 'dup' },
      { from: 'a', to: 'c', type: 'read-write' },
    ]);
    expect(deps).toEqual([
      { from: 'a', to: 'b', type: 'direct-call', description: 'first' },
      { from: 'a', to: 'c', type: 'read-write' },
    ]);
  });
});

describe('graph walk kernel isolation', () => {
  it('does not import the Zod wire contract or schema field validators', () => {
    expect(graphValidateSource).not.toMatch(/systemSchema|graphSchema|from ['"]zod['"]/);
  });
});

describe('Graph Validation & Cycle Detection', () => {
  it('should validate a clean, acyclic graph', () => {
    const schema: SystemSchema = {
      name: 'Acyclic System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'Gateway', type: 'rest-api', name: 'Gateway' },
        { entityRef: 'AuthService', type: 'grpc-service', name: 'AuthService' },
        { entityRef: 'SessionDB', type: 'relational-database', name: 'SessionDB' },
      ],
      dependencies: [
        { from: 'Gateway', to: 'AuthService', type: 'direct-call' },
        { from: 'AuthService', to: 'SessionDB', type: 'read-write' },
      ],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect a direct cycle (A -> A)', () => {
    const schema: SystemSchema = {
      name: 'Self Loop',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'Worker', type: 'serverless-function', name: 'Worker' }],
      dependencies: [{ from: 'Worker', to: 'Worker', type: 'direct-call' }],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('cycle');
    expect(result.issues[0].path).toEqual(['Worker', 'Worker']);
  });

  it('should detect a multi-node cycle (A -> B -> C -> A)', () => {
    const schema: SystemSchema = {
      name: 'Circular Services',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'ServiceA', type: 'grpc-service', name: 'Service A' },
        { entityRef: 'ServiceB', type: 'grpc-service', name: 'Service B' },
        { entityRef: 'ServiceC', type: 'grpc-service', name: 'Service C' },
      ],
      dependencies: [
        { from: 'ServiceA', to: 'ServiceB', type: 'direct-call' },
        { from: 'ServiceB', to: 'ServiceC', type: 'direct-call' },
        { from: 'ServiceC', to: 'ServiceA', type: 'direct-call' },
      ],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('cycle');

    const path = result.issues[0].path;
    expect(path).toContain('ServiceA');
    expect(path).toContain('ServiceB');
    expect(path).toContain('ServiceC');
    expect(path![0]).toBe(path![path!.length - 1]);
  });

  it('should detect cycles in disconnected subgraphs', () => {
    const schema: SystemSchema = {
      name: 'Disconnected Cycles',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'A', type: 'rest-api', name: 'A' },
        { entityRef: 'B', type: 'grpc-service', name: 'B' },
        { entityRef: 'C', type: 'event-broker', name: 'C' },
        { entityRef: 'D', type: 'event-broker', name: 'D' },
      ],
      dependencies: [
        { from: 'A', to: 'B', type: 'direct-call' },
        { from: 'C', to: 'D', type: 'publish-subscribe' },
        { from: 'D', to: 'C', type: 'publish-subscribe' },
      ],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('cycle');
    expect(result.issues[0].path).toContain('C');
    expect(result.issues[0].path).toContain('D');
  });
});
