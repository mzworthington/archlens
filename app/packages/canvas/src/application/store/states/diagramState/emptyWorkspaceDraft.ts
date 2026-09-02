/**
 * Blank-canvas (Ideate) drafts live in IndexedDB under EMPTY_WORKSPACE_PATH,
 * but the in-memory store does not survive a refresh. Restore and leave-warning
 * rules stay here so the UI and store share one contract.
 */

import { clearBlankCanvasSession } from '../ioState/blankCanvasSession';

let skipRestoreOnce = false;
let restoreClaimed = false;

/** Ideate / import-from-scratch this page session — do not immediately rehydrate. */
export function markEmptyWorkspaceResetThisSession(): void {
  skipRestoreOnce = true;
  clearBlankCanvasSession();
}

export function consumeEmptyWorkspaceRestoreSkip(): boolean {
  if (!skipRestoreOnce) return false;
  skipRestoreOnce = false;
  return true;
}

/**
 * One restore attempt per page session (survives React StrictMode remounts).
 * Returns false when skip-restore was set (explicit blank start).
 */
export function claimEmptyWorkspaceDraftRestore(): boolean {
  if (restoreClaimed) return false;
  restoreClaimed = true;
  if (consumeEmptyWorkspaceRestoreSkip()) return false;
  return true;
}

export function resetEmptyWorkspaceDraftSessionForTests(): void {
  skipRestoreOnce = false;
  restoreClaimed = false;
  clearBlankCanvasSession();
}

export function shouldRestoreEmptyWorkspaceDraft(input: {
  isWorkspaceOpen: boolean;
  hasCollabRoom: boolean;
  inMemoryNodeCount: number;
  draftNodeCount: number;
}): boolean {
  if (input.isWorkspaceOpen) return false;
  if (input.hasCollabRoom) return false;
  if (input.inMemoryNodeCount > 0) return false;
  return input.draftNodeCount > 0;
}

/** Warn on refresh/close when a closed-folder canvas has nodes (nothing on disk yet). */
export function shouldWarnBeforeLeavingBlankCanvas(input: {
  isWorkspaceOpen: boolean;
  nodeCount: number;
}): boolean {
  return !input.isWorkspaceOpen && input.nodeCount > 0;
}
