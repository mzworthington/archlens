export function shouldPreviewCollabVsDisk(input: {
  collabActive: boolean;
  isWorkspaceOpen: boolean;
}): boolean {
  return input.collabActive && input.isWorkspaceOpen;
}

export function keepDiskRequiresRoomPush(collabActive: boolean): boolean {
  return collabActive;
}

export function keepDiskConfirmMessage(collabActive: boolean): string {
  if (collabActive) {
    return 'Keep the file on disk? Peers lose unsaved live edits in this room.';
  }
  return 'Are you sure you want to revert all unsaved draft changes for this diagram?';
}
