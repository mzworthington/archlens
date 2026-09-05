import type { C4Level, EntityRef } from '../lib/entityRefIdentity.ts';
export * from '../lib/entityRefIdentity.ts';
export { slugify } from '../lib/slug.ts';

export type NodeType =
  | 'person'
  | 'software-system'
  | 'web-app'
  | 'mobile-app'
  | 'single-page-app'
  | 'microservice'
  | 'database'
  | 'cache-store'
  | 'event-broker'
  | 'serverless-app'
  | 'component'
  | 'container'
  | 'code-module'
  | 'relational-database'
  | 'grpc-service'
  | 'serverless-function'
  | 'rest-api'
  | 'gateway-api'
  | 'background-worker'
  | 'group';

export interface NodeResilience {
  circuitBreaker?: boolean;
  bulkhead?: boolean;
  retry?: boolean;
  localCache?: boolean;
}

export interface PropertyMap {
  [key: string]: string | number | boolean;
}

export type ForensicClassification = 'hotspot' | 'knowledge-silo';

export interface CoupledFileForensics {
  path: string;
  score: number;
  sharedCommits: number;
}

export interface ImportedFileForensics {
  path: string;
  kind: 'direct';
}

export interface ForensicAuthor {
  email: string;
  commits: number;
}

export interface NodeForensics {
  complexity?: number;
  complexityPeak?: number;
  cognitiveComplexity?: number;
  functionCount?: number;
  loc?: number;
  sloc?: number;
  churn?: number;
  lineChurn?: number;
  churn30?: number;
  churn365?: number;
  churnByWeek?: number[];
  /** Weekly relative hotspotScore (oldest week first); current complexity × that week's churn. */
  hotspotScoreByWeek?: number[];
  authorCount?: number;
  topAuthorPercent?: number;
  authors?: ForensicAuthor[];
  hotspotScore?: number;
  classifications?: ForensicClassification[];
  coupledFiles?: CoupledFileForensics[];
  importedFiles?: ImportedFileForensics[];
  sinceDays?: number;
  shortChurnDays?: number;
  fileCount?: number;
  hotspotCount?: number;
  knowledgeSiloCount?: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface SystemNode {
  entityRef: EntityRef;
  type: NodeType;
  name: string;
  external?: boolean;
  properties?: PropertyMap;
  isTest?: boolean;
  parentEntityRef?: EntityRef;
  position?: NodePosition;
  forensics?: NodeForensics;
  resilience?: NodeResilience;
}

export type DependencyType =
  | 'direct-call'
  | 'publish-subscribe'
  | 'read-write'
  | 'inter-container'
  /** IaC declaration → provisioned cloud resource (not a runtime call). */
  | 'provisions';

export interface SystemDependency {
  from: EntityRef;
  to: EntityRef;
  type: DependencyType;
  description?: string;
}

export interface SourceProvenance {
  remoteUrl?: string;
  defaultBranch?: string;
  scannedAtCommit?: string;
  scanRoot?: string;
  systemName?: string;
}

export interface SystemSchema {
  entityRef?: EntityRef;
  name: string;
  version: string;
  level: C4Level;
  nodes: SystemNode[];
  dependencies: SystemDependency[];
  source?: SourceProvenance;
}

export interface ValidationIssue {
  type: 'cycle' | 'disconnected' | 'invalid-connection';
  message: string;
  path?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}
