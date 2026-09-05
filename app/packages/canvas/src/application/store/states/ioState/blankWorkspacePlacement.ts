export const BLANK_WORKSPACE_PLACEMENTS = ['file', 'folder', 'unsaved'] as const;
export type BlankWorkspacePlacement = (typeof BLANK_WORKSPACE_PLACEMENTS)[number];

export const DEFAULT_BLANK_WORKSPACE_NAME = 'Empty Workspace';
const BOOT_PLACEHOLDER_WORKSPACE_NAME = 'Loading';

export function editorNameForBlankWorkspace(schemaName: string): string {
  return schemaName === BOOT_PLACEHOLDER_WORKSPACE_NAME ? DEFAULT_BLANK_WORKSPACE_NAME : schemaName;
}

export function isBlankWorkspacePlacement(value: unknown): value is BlankWorkspacePlacement {
  return value === 'file' || value === 'folder' || value === 'unsaved';
}

export function resolveBlankWorkspaceName(
  draft: string,
  fallback = DEFAULT_BLANK_WORKSPACE_NAME
): string {
  const trimmed = draft.trim();
  return trimmed === '' ? fallback : trimmed;
}

export function blankWorkspacePlacementLabel(placement: BlankWorkspacePlacement): string {
  if (placement === 'file') {
    return 'Saved as a file';
  }
  if (placement === 'folder') {
    return 'Saved in a folder';
  }
  return 'Unsaved — not on disk yet';
}

export function shouldPromptSaveBeforeShare(placement: BlankWorkspacePlacement): boolean {
  return placement === 'unsaved';
}

export function canContinueUnsaved(acknowledgedRisk: boolean): boolean {
  return acknowledgedRisk;
}
