import { describe, expect, it } from 'vitest';
import type { NodeType } from '../models/schema';
import { isUserFacingRole, nodeRole, nodeRolePriority } from './nodeRoles';

const ALL_NODE_TYPES: NodeType[] = [
  'person',
  'software-system',
  'web-app',
  'mobile-app',
  'single-page-app',
  'microservice',
  'database',
  'cache-store',
  'event-broker',
  'serverless-app',
  'component',
  'container',
  'code-module',
  'relational-database',
  'grpc-service',
  'serverless-function',
  'rest-api',
  'gateway-api',
  'background-worker',
  'group',
];

describe('nodeRole', () => {
  it('maps every NodeType to a role', () => {
    for (const type of ALL_NODE_TYPES) {
      expect(nodeRole(type)).toBeTruthy();
    }
  });

  it('classifies user-facing and async roles', () => {
    expect(nodeRole('person')).toBe('actor');
    expect(nodeRole('web-app')).toBe('user-facing');
    expect(isUserFacingRole(nodeRole('web-app'))).toBe(true);
    expect(isUserFacingRole(nodeRole('person'))).toBe(false);
    expect(nodeRole('background-worker')).toBe('async-worker');
    expect(nodeRole('event-broker')).toBe('message-infrastructure');
  });

  it('ranks user-facing above data stores for merge precedence', () => {
    expect(nodeRolePriority('user-facing')).toBeGreaterThan(nodeRolePriority('data-store'));
    expect(nodeRolePriority('message-infrastructure')).toBeGreaterThan(
      nodeRolePriority('async-worker')
    );
  });
});
