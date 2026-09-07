import type { EntityRef } from '../models/schema';

export type FaultType = 'latency' | 'error-rate' | 'packet-loss' | 'region-outage';

export interface NodeSafeguards {
  circuitBreaker?: boolean;
  bulkhead?: boolean;
  retry?: boolean;
  localCache?: boolean;
}

export interface NodeFaultConfig {
  nodeId: EntityRef;
  faultType: FaultType;
  /** 0-1 severity for partial faults; region-outage implies 1.0 */
  severity?: number;
  safeguards?: NodeSafeguards;
}

export interface ChaosSpec {
  faults: NodeFaultConfig[];
  /** Per-node safeguard toggles keyed by entityRef. */
  safeguards?: Partial<Record<EntityRef, NodeSafeguards>>;
  entryPoints?: EntityRef[];
}

/** Default severity when a fault type does not specify one explicitly. */
export function defaultFaultSeverity(faultType: FaultType): number {
  switch (faultType) {
    case 'region-outage':
      return 1;
    case 'error-rate':
      return 0.8;
    case 'packet-loss':
      return 0.6;
    case 'latency':
      return 0.4;
  }
}

export function resolveFaultSeverity(fault: NodeFaultConfig): number {
  const base = fault.severity ?? defaultFaultSeverity(fault.faultType);
  return Math.min(1, Math.max(0, base));
}
