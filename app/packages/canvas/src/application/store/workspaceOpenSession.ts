/**
 * Monotonic generation for workspace open attempts.
 * Folder and demo opens bump this so an in-flight open cannot overwrite a newer choice.
 *
 * Also tracks whether the user chose a folder workspace this session - deep-link
 * bootstrap must not force demo mode after that choice.
 */
let workspaceOpenGeneration = 0;
let folderWorkspacePreferred = false;
let demoBootstrapClaimed = false;

/** Start a new open attempt; invalidates any in-flight open with a lower generation. */
export function beginWorkspaceOpen(): number {
  workspaceOpenGeneration += 1;
  return workspaceOpenGeneration;
}

/** True when this generation is still the latest open attempt. */
export function isWorkspaceOpenCurrent(generation: number): boolean {
  return generation === workspaceOpenGeneration;
}

/** User opened (or is opening) a local folder - never auto-bootstrap demo afterward. */
export function markFolderWorkspacePreferred(): void {
  folderWorkspacePreferred = true;
  demoBootstrapClaimed = true;
}

/**
 * Clear a folder preference that never produced an open workspace
 * (e.g. browser scan failed after the folder picker). Allows demo bootstrap again.
 */
export function clearFolderWorkspacePreferred(): void {
  folderWorkspacePreferred = false;
}

/** User explicitly opened the bundled demo. */
export function markDemoWorkspacePreferred(): void {
  folderWorkspacePreferred = false;
}

export function isFolderWorkspacePreferred(): boolean {
  return folderWorkspacePreferred;
}

/**
 * Claim the one-shot deep-link demo bootstrap for this page session.
 * Survives React StrictMode remounts (unlike a component useRef).
 */
export function claimDemoBootstrap(): boolean {
  if (folderWorkspacePreferred || demoBootstrapClaimed) return false;
  demoBootstrapClaimed = true;
  return true;
}

export function releaseDemoBootstrapClaim(): void {
  if (!folderWorkspacePreferred) {
    demoBootstrapClaimed = false;
  }
}

/** Test helper - reset between cases. */
export function resetWorkspaceOpenSessionForTests(): void {
  workspaceOpenGeneration = 0;
  folderWorkspacePreferred = false;
  demoBootstrapClaimed = false;
}
