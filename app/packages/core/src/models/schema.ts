import { slugify } from '../lib/slug.ts';

export type C4Level = 'context' | 'container' | 'component' | 'code';

export type EntityRef = string;

export { slugify };

export const EntityRef = {
  /**
   * Create a reference by slugifying and joining parts.
   */
  create(...parts: string[]): EntityRef {
    const cleanParts = parts.filter(Boolean).map(p => slugify(p));
    if (cleanParts.length === 0)
      throw new Error('At least one part is required to create an EntityRef.');
    return cleanParts.join('/');
  },

  /**
   * Evaluates the structural level based on the number of path segments
   */
  getLevel(ref: EntityRef): C4Level {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 4) {
      throw new Error(`Invalid EntityRef structure layout: ${ref}`);
    }
    switch (segments.length) {
      case 1:
        return 'context';
      case 2:
        return 'container';
      case 3:
        return 'component';
      default:
        return 'code';
    }
  },

  /**
   * Parses a reference value, optionally nesting it under a parent EntityRef.
   */
  parse(value: string, parent?: EntityRef): EntityRef {
    if (!value?.trim()) throw new Error('Value is required.');
    if (parent) {
      return this.child(parent, value);
    }
    return slugify(value);
  },

  /**
   * Appends a child reference identifier to a parent EntityRef.
   */
  child(parent: EntityRef, child: string): EntityRef {
    if (!parent?.trim()) throw new Error('Parent EntityRef is required.');
    if (!child?.trim()) throw new Error('Child identifier is required.');
    return `${parent}/${slugify(child)}`;
  },

  /**
   * Extracts the container ID segment from a container or component FQN.
   */
  getContainerId(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new Error('EntityRef is not at container or component level: ' + ref);
    }
    if (segments.length >= 3) {
      return segments[segments.length - 2];
    }
    return segments[segments.length - 1];
  },

  /**
   * Retrieves the parent EntityRef of the given ref.
   */
  getParent(ref: EntityRef): EntityRef | null {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length <= 1) {
      return null;
    }
    return segments.slice(0, -1).join('/');
  },

  /**
   * Retrieves the last segment (leaf) of the given EntityRef.
   */
  leaf(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0) return '';
    return segments[segments.length - 1];
  },

  /**
   * Grouping key for ChaosLens impacted-domain telemetry.
   * Two-segment refs use the prefix (e.g. shop/api → shop).
   * Deeper refs use the parent container segment (e.g. application/.../large-graph/node → large-graph).
   */
  getImpactedDomainGroup(ref: EntityRef): string {
    const segments = ref.split('/').filter(Boolean);
    if (segments.length === 0) return ref;
    if (segments.length <= 2) return segments[0];
    return segments[segments.length - 2];
  },
};

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
