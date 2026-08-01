export type DependencyViewMode = 'full' | 'focus' | 'focus-externals';

export function showSelectedDependenciesOnlyFromMode(mode: DependencyViewMode): boolean {
  return mode !== 'full';
}

export function includeExternalsInFocusFromMode(mode: DependencyViewMode): boolean {
  return mode === 'focus-externals';
}

/** Legacy boolean toggle: full ↔ focus (drops focus-externals). */
export function toggleDependencyViewMode(mode: DependencyViewMode): DependencyViewMode {
  return mode === 'full' ? 'focus' : 'full';
}

export function dependencyViewModeFromLegacy(showSelectedOnly: boolean): DependencyViewMode {
  return showSelectedOnly ? 'focus' : 'full';
}
