export function shouldPreviewCollabVsDisk(input: {
  collabActive: boolean;
  isWorkspaceOpen: boolean;
}): boolean {
  return input.collabActive && input.isWorkspaceOpen;
}

export function keepDiskRequiresRoomPush(collabActive: boolean): boolean {
  return collabActive;
}

/** Confirm copy for reverting the live room to the on-disk baseline. */
export function keepDiskConfirmMessage(collabActive: boolean): string {
  if (!collabActive) {
    return 'Are you sure you want to revert all unsaved draft changes for this diagram?';
  }
  return (
    "Keep disk will push the on-disk baseline into the live room and discard peers' unsaved " +
    'live edits for this diagram. Continue?'
  );
}
