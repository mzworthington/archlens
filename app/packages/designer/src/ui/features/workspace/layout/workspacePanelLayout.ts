import type {
  LeftSlotPanelId,
  WorkspacePanelId,
  WorkspacePanelSlot,
} from '../../../../application/layout/workspacePanels';

export type { WorkspacePanelId, WorkspacePanelSlot, LeftSlotPanelId };

/** Single source of truth for panel placement — change slot here to relocate panels. */
export const WORKSPACE_PANEL_SLOTS: Record<WorkspacePanelId, WorkspacePanelSlot> = {
  codeViewer: 'left',
  traceLens: 'left',
  properties: 'right',
};

export const WORKSPACE_PANEL_WIDTH: Record<WorkspacePanelSlot, string> = {
  left: '384px',
  right: '320px',
};

export const WORKSPACE_PANEL_WIDTH_CLASS: Record<WorkspacePanelSlot, string> = {
  left: 'sm:w-96',
  right: 'sm:w-80',
};

/** Panels that share a slot — only one may be active at a time. */
export const MUTUALLY_EXCLUSIVE_SLOTS: Partial<Record<WorkspacePanelSlot, WorkspacePanelId[]>> = {
  left: ['codeViewer', 'traceLens'],
};

export function panelSlot(panelId: WorkspacePanelId): WorkspacePanelSlot {
  return WORKSPACE_PANEL_SLOTS[panelId];
}

export function panelsInSlot(slot: WorkspacePanelSlot): WorkspacePanelId[] {
  return (Object.entries(WORKSPACE_PANEL_SLOTS) as [WorkspacePanelId, WorkspacePanelSlot][])
    .filter(([, s]) => s === slot)
    .map(([id]) => id);
}

export function resolveActivePanelInSlot(
  slot: WorkspacePanelSlot,
  activeBySlot: Partial<Record<WorkspacePanelSlot, WorkspacePanelId | null>>
): WorkspacePanelId | null {
  const candidates = panelsInSlot(slot);
  const active = activeBySlot[slot];
  if (active && candidates.includes(active)) return active;
  return candidates[0] ?? null;
}
