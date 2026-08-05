import {
  defaultFaultSeverity,
  type FaultType,
  type NodeFaultConfig,
} from '@archlens/core/resilience';
import {
  buildWorkspacePath,
  isWorkspacePath,
  workspaceEntityRefFromPath,
} from '../navigation/workspaceUrl';

export type ChaosLensUrlState = {
  entityRef?: string;
  faults: NodeFaultConfig[];
  /** When true, open the Browse ChaosSpecs picker (`browse=chaosspecs`). */
  browseChaosSpecs: boolean;
};

export type ChaosLensUrlOptions = {
  faults?: NodeFaultConfig[];
  browseChaosSpecs?: boolean;
};

export const CHAOS_SPEC_BROWSE_PARAM = 'browse';
export const CHAOS_SPEC_BROWSE_VALUE = 'chaosspecs';

const FAULT_TYPES = new Set<FaultType>(['latency', 'error-rate', 'packet-loss', 'region-outage']);

function parseFaultType(value: string | null | undefined): FaultType | null {
  if (!value || !FAULT_TYPES.has(value as FaultType)) return null;
  return value as FaultType;
}

function formatSeverity(severity: number): string {
  // Trim trailing zeros so 0.55 stays 0.55 and 1 stays 1.
  return String(Number(severity.toFixed(4)));
}

function serializeFault(fault: NodeFaultConfig): string {
  const severity = fault.severity ?? defaultFaultSeverity(fault.faultType);
  const defaultSeverity = defaultFaultSeverity(fault.faultType);
  if (Math.abs(severity - defaultSeverity) < 1e-9) {
    return `${fault.nodeId}~${fault.faultType}`;
  }
  return `${fault.nodeId}~${fault.faultType}~${formatSeverity(severity)}`;
}

function parseFaultToken(token: string): NodeFaultConfig | null {
  const parts = token
    .split('~')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const [nodeId, typeRaw, severityRaw] = parts;
  const faultType = parseFaultType(typeRaw);
  if (!nodeId || !faultType) return null;
  const severity =
    severityRaw != null && severityRaw !== ''
      ? Math.min(1, Math.max(0, Number(severityRaw)))
      : defaultFaultSeverity(faultType);
  if (Number.isNaN(severity)) return null;
  return { nodeId, faultType, severity };
}

function parseSingleFaultParams(params: URLSearchParams): NodeFaultConfig[] {
  const nodeId = params.get('fault');
  if (!nodeId) return [];
  const faultType = parseFaultType(params.get('type')) ?? 'region-outage';
  const severityRaw = params.get('severity');
  const severity =
    severityRaw != null && severityRaw !== ''
      ? Math.min(1, Math.max(0, Number(severityRaw)))
      : defaultFaultSeverity(faultType);
  if (Number.isNaN(severity)) return [];
  return [{ nodeId, faultType, severity }];
}

function parseFaultsParam(params: URLSearchParams): NodeFaultConfig[] {
  const raw = params.get('faults');
  if (!raw) return [];
  return raw
    .split('|')
    .map(parseFaultToken)
    .filter((fault): fault is NodeFaultConfig => fault != null);
}

export function isChaosLensUrl(pathname: string, search = ''): boolean {
  if (!isWorkspacePath(pathname)) return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return params.get('lens') === 'chaoslens';
}

export function buildChaosLensPath(scopeEntityRef?: string | null): string {
  return buildWorkspacePath(scopeEntityRef);
}

export function buildChaosLensUrl(
  scopeEntityRef?: string | null,
  options: ChaosLensUrlOptions = {}
): string {
  const path = buildChaosLensPath(scopeEntityRef);
  const params = new URLSearchParams();
  params.set('lens', 'chaoslens');

  const faults = options.faults ?? [];
  if (faults.length === 1) {
    const [fault] = faults;
    params.set('fault', fault.nodeId);
    params.set('type', fault.faultType);
    const severity = fault.severity ?? defaultFaultSeverity(fault.faultType);
    const defaultSeverity = defaultFaultSeverity(fault.faultType);
    if (Math.abs(severity - defaultSeverity) >= 1e-9) {
      params.set('severity', formatSeverity(severity));
    }
  } else if (faults.length > 1) {
    params.set('faults', faults.map(serializeFault).join('|'));
  }

  if (options.browseChaosSpecs) {
    params.set(CHAOS_SPEC_BROWSE_PARAM, CHAOS_SPEC_BROWSE_VALUE);
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseChaosLensUrl(pathname: string, search = ''): ChaosLensUrlState {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const entityRef = workspaceEntityRefFromPath(pathname);
  const browseChaosSpecs = params.get(CHAOS_SPEC_BROWSE_PARAM) === CHAOS_SPEC_BROWSE_VALUE;
  const faults = parseFaultsParam(params);
  if (faults.length > 0) {
    return { entityRef, faults, browseChaosSpecs };
  }
  return { entityRef, faults: parseSingleFaultParams(params), browseChaosSpecs };
}

export function clearChaosLensSearchParams(search = ''): string {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  if (params.get('lens') === 'chaoslens') params.delete('lens');
  params.delete('resilience');
  params.delete('fault');
  params.delete('type');
  params.delete('severity');
  params.delete('faults');
  params.delete(CHAOS_SPEC_BROWSE_PARAM);
  return params.toString();
}

export function resilienceFaultsEqual(a: NodeFaultConfig[], b: NodeFaultConfig[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((fault, index) => {
    const other = b[index];
    const severity = fault.severity ?? defaultFaultSeverity(fault.faultType);
    const otherSeverity = other.severity ?? defaultFaultSeverity(other.faultType);
    return (
      fault.nodeId === other.nodeId &&
      fault.faultType === other.faultType &&
      Math.abs(severity - otherSeverity) < 1e-9
    );
  });
}
