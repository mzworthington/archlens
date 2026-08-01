import type { NodeType } from '../models/schema';

export type NodeRole =
  | 'actor'
  | 'user-facing'
  | 'sync-service'
  | 'async-worker'
  | 'message-infrastructure'
  | 'data-store'
  | 'serverless'
  | 'structural';

const NODE_ROLE_BY_TYPE: Record<NodeType, NodeRole> = {
  person: 'actor',
  'web-app': 'user-facing',
  'mobile-app': 'user-facing',
  'single-page-app': 'user-facing',
  'gateway-api': 'user-facing',
  microservice: 'sync-service',
  'rest-api': 'sync-service',
  'grpc-service': 'sync-service',
  'background-worker': 'async-worker',
  'event-broker': 'message-infrastructure',
  database: 'data-store',
  'relational-database': 'data-store',
  'cache-store': 'data-store',
  'serverless-app': 'serverless',
  'serverless-function': 'serverless',
  group: 'structural',
  container: 'structural',
  component: 'structural',
  'code-module': 'structural',
  'software-system': 'structural',
};

export function nodeRole(type: NodeType): NodeRole {
  return NODE_ROLE_BY_TYPE[type];
}

export function isUserFacingRole(role: NodeRole): boolean {
  return role === 'user-facing';
}

/** Prefer more specific roles when merging inferred types (e.g. CLI rollups). */
export function nodeRolePriority(role: NodeRole): number {
  switch (role) {
    case 'actor':
      return 5;
    case 'user-facing':
      return 50;
    case 'message-infrastructure':
      return 40;
    case 'data-store':
      return 30;
    case 'sync-service':
      return 25;
    case 'async-worker':
      return 20;
    case 'serverless':
      return 15;
    default:
      return 10;
  }
}
