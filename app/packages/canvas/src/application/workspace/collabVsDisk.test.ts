import { describe, expect, it } from 'vitest';
import {
  keepDiskConfirmMessage,
  keepDiskRequiresRoomPush,
  shouldPreviewCollabVsDisk,
} from './collabVsDisk';

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

  it('warns that keeping disk drops unsaved live edits for peers', () => {
    expect(keepDiskConfirmMessage(true)).toMatch(/peers lose unsaved live edits/i);
    expect(keepDiskConfirmMessage(false)).toMatch(/revert all unsaved draft changes/i);
  });
});
