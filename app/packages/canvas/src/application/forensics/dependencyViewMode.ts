export type DependencyViewMode = 'full' | 'focus' | 'focus-externals';

/** True when canvas should filter to the selected node's dependency neighborhood. */
export function isDependencyFocusMode(mode: DependencyViewMode): boolean {
  return mode !== 'full';
}

export function includeExternalsInFocusFromMode(mode: DependencyViewMode): boolean {
  return mode === 'focus-externals';
}

/** Boolean toggle: full ↔ focus (drops focus-externals). */
export function toggleDependencyViewMode(mode: DependencyViewMode): DependencyViewMode {
  return mode === 'full' ? 'focus' : 'full';
}

/**
 * Keep dependency focus mode aligned with Callers/Targets:
 * any band on promotes focus → focus-externals; both off demotes back.
 */
export function dependencyModeForExternalToggles(
  mode: DependencyViewMode,
  showUpstreamExternals: boolean,
  showDownstreamExternals: boolean
): DependencyViewMode {
  if (showUpstreamExternals || showDownstreamExternals) {
    return mode === 'focus' ? 'focus-externals' : mode;
  }
  return mode === 'focus-externals' ? 'focus' : mode;
}
