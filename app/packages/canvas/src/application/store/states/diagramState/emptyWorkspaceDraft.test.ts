import { describe, expect, it, beforeEach } from 'vitest';
import {
  claimEmptyWorkspaceDraftRestore,
  consumeEmptyWorkspaceRestoreSkip,
  markEmptyWorkspaceResetThisSession,
  resetEmptyWorkspaceDraftSessionForTests,
  shouldRestoreEmptyWorkspaceDraft,
  shouldWarnBeforeLeavingBlankCanvas,
} from './emptyWorkspaceDraft';

describe('emptyWorkspaceDraft', () => {
  beforeEach(() => {
    resetEmptyWorkspaceDraftSessionForTests();
  });

  it('restores only when the in-memory canvas is empty, no folder is open, and the draft has nodes', () => {
    expect(
      shouldRestoreEmptyWorkspaceDraft({
        isWorkspaceOpen: false,
        hasCollabRoom: false,
        inMemoryNodeCount: 0,
        draftNodeCount: 2,
      })
    ).toBe(true);
    expect(
      shouldRestoreEmptyWorkspaceDraft({
        isWorkspaceOpen: false,
        hasCollabRoom: false,
        inMemoryNodeCount: 0,
        draftNodeCount: 0,
      })
    ).toBe(false);
    expect(
      shouldRestoreEmptyWorkspaceDraft({
        isWorkspaceOpen: true,
        hasCollabRoom: false,
        inMemoryNodeCount: 0,
        draftNodeCount: 2,
      })
    ).toBe(false);
    expect(
      shouldRestoreEmptyWorkspaceDraft({
        isWorkspaceOpen: false,
        hasCollabRoom: true,
        inMemoryNodeCount: 0,
        draftNodeCount: 2,
      })
    ).toBe(false);
    expect(
      shouldRestoreEmptyWorkspaceDraft({
        isWorkspaceOpen: false,
        hasCollabRoom: false,
        inMemoryNodeCount: 1,
        draftNodeCount: 2,
      })
    ).toBe(false);
  });

  it('warns before leaving when a blank-canvas session has nodes and no folder', () => {
    expect(shouldWarnBeforeLeavingBlankCanvas({ isWorkspaceOpen: false, nodeCount: 1 })).toBe(true);
    expect(shouldWarnBeforeLeavingBlankCanvas({ isWorkspaceOpen: false, nodeCount: 0 })).toBe(
      false
    );
    expect(shouldWarnBeforeLeavingBlankCanvas({ isWorkspaceOpen: true, nodeCount: 3 })).toBe(false);
  });

  it('skips the next restore after an explicit blank reset', () => {
    markEmptyWorkspaceResetThisSession();
    expect(consumeEmptyWorkspaceRestoreSkip()).toBe(true);
    expect(consumeEmptyWorkspaceRestoreSkip()).toBe(false);
  });

  it('claims restore once per page session unless an explicit reset skipped it', () => {
    expect(claimEmptyWorkspaceDraftRestore()).toBe(true);
    expect(claimEmptyWorkspaceDraftRestore()).toBe(false);

    resetEmptyWorkspaceDraftSessionForTests();
    markEmptyWorkspaceResetThisSession();
    expect(claimEmptyWorkspaceDraftRestore()).toBe(false);
    expect(claimEmptyWorkspaceDraftRestore()).toBe(false);
  });
});
