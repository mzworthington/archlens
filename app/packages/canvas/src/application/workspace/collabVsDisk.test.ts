import { describe, expect, it } from 'vitest';
import { keepDiskRequiresRoomPush, shouldPreviewCollabVsDisk } from './collabVsDisk';

describe('collabVsDisk', () => {
  it('only previews live room vs disk in a folder workspace that is in a room', () => {
    expect(shouldPreviewCollabVsDisk({ collabActive: true, isWorkspaceOpen: true })).toBe(true);
    expect(shouldPreviewCollabVsDisk({ collabActive: true, isWorkspaceOpen: false })).toBe(false);
    expect(shouldPreviewCollabVsDisk({ collabActive: false, isWorkspaceOpen: true })).toBe(false);
  });

  it('requires pushing disk back to the room when keeping disk in a live session', () => {
    expect(keepDiskRequiresRoomPush(true)).toBe(true);
    expect(keepDiskRequiresRoomPush(false)).toBe(false);
  });
});
