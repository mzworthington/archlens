import type { EntityRef } from '@archlens/core';
import type { FaultType, NodeFaultConfig } from '@archlens/core/resilience';
import { isDesktopViewport } from '../../layoutUtils';
import type { BlueprintState } from '../../store';

export function resilienceModePanelPatch(): Partial<BlueprintState> {
  return {
    activeLeftPanel: 'chaosLens',
    leftCollapsed: false,
    resiliencePanelTab: 'simulation',
    ...(isDesktopViewport() ? { rightCollapsed: false } : {}),
  };
}

export function upsertFault(
  faults: NodeFaultConfig[],
  nodeId: EntityRef,
  faultType: FaultType,
  severity: number
): NodeFaultConfig[] {
  const nextFault: NodeFaultConfig = { nodeId, faultType, severity };
  const index = faults.findIndex(fault => fault.nodeId === nodeId);
  if (index === -1) return [...faults, nextFault];
  const updated = [...faults];
  updated[index] = { ...updated[index], ...nextFault };
  return updated;
}
