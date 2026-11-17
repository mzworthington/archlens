import { describe, expect, it } from 'vitest';
import {
  dependencyModeForExternalToggles,
  includeExternalsInFocusFromMode,
  isDependencyFocusMode,
  toggleDependencyViewMode,
} from './dependencyViewMode';

describe('dependencyViewMode', () => {
  it('classifies focus modes', () => {
    expect(isDependencyFocusMode('full')).toBe(false);
    expect(isDependencyFocusMode('focus')).toBe(true);
    expect(isDependencyFocusMode('focus-externals')).toBe(true);
    expect(includeExternalsInFocusFromMode('focus')).toBe(false);
    expect(includeExternalsInFocusFromMode('focus-externals')).toBe(true);
  });

  it('toggles full ↔ focus', () => {
    expect(toggleDependencyViewMode('full')).toBe('focus');
    expect(toggleDependencyViewMode('focus')).toBe('full');
    expect(toggleDependencyViewMode('focus-externals')).toBe('full');
  });

  it('promotes and demotes with caller/target toggles', () => {
    expect(dependencyModeForExternalToggles('focus', true, false)).toBe('focus-externals');
    expect(dependencyModeForExternalToggles('focus', false, true)).toBe('focus-externals');
    expect(dependencyModeForExternalToggles('focus-externals', true, false)).toBe(
      'focus-externals'
    );
    expect(dependencyModeForExternalToggles('focus-externals', false, false)).toBe('focus');
    expect(dependencyModeForExternalToggles('full', true, false)).toBe('full');
    expect(dependencyModeForExternalToggles('full', false, false)).toBe('full');
  });
});
