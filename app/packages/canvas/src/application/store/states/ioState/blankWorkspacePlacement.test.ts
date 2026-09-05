import { describe, expect, it } from 'vitest';
import {
  blankWorkspacePlacementLabel,
  canContinueUnsaved,
  editorNameForBlankWorkspace,
  isBlankWorkspacePlacement,
  resolveBlankWorkspaceName,
  shouldPromptSaveBeforeShare,
} from './blankWorkspacePlacement';

describe('blankWorkspacePlacement', () => {
  it('keeps a typed name and falls back when the field is blank', () => {
    expect(resolveBlankWorkspaceName('Checkout')).toBe('Checkout');
    expect(resolveBlankWorkspaceName('   ')).toBe('Empty Workspace');
  });

  it('does not show the boot placeholder as a workspace name', () => {
    expect(editorNameForBlankWorkspace('Loading')).toBe('Empty Workspace');
    expect(editorNameForBlankWorkspace('Checkout')).toBe('Checkout');
  });

  it('names file, folder, and unsaved placements', () => {
    expect(blankWorkspacePlacementLabel('file')).toBe('Saved as a file');
    expect(blankWorkspacePlacementLabel('folder')).toBe('Saved in a folder');
    expect(blankWorkspacePlacementLabel('unsaved')).toBe('Unsaved — not on disk yet');
  });

  it('requires an explicit ack before continuing unsaved', () => {
    expect(canContinueUnsaved(false)).toBe(false);
    expect(canContinueUnsaved(true)).toBe(true);
  });

  it('asks to save before share while the canvas is still unsaved', () => {
    expect(shouldPromptSaveBeforeShare('unsaved')).toBe(true);
    expect(shouldPromptSaveBeforeShare('file')).toBe(false);
    expect(isBlankWorkspacePlacement('folder')).toBe(true);
    expect(isBlankWorkspacePlacement('disk')).toBe(false);
  });
});
